/**
 * Main bridge manager - orchestrates all bridge operations
 */
import { CallbackRegistry } from './CallbackRegistry';
import { MessageQueue } from './MessageQueue';
import { createNativeAdapter, type NativeAdapter } from '../adapters/index';
import { FallbackAdapter } from '../adapters/FallbackAdapter';
import { MiddlewarePipeline } from '../middleware/MiddlewarePipeline';
import { generateMessageId } from '../utils/id-generator';
import type {
  BridgeConfig,
  BridgeCallOptions,
  BridgeMessage,
  BridgeResponse,
  BridgeEvent,
  BridgeError,
  Middleware,
  MiddlewareContext,
  MiddlewareFn,
  ActionDefinitionShape,
  ActionNames,
  InferPayload,
  InferResponse,
  ConnectionMode,
} from '@webview-ts/shared';
/**
 * Event handler type
 */
type EventHandler<T = unknown> = (payload: T) => void;

/**
 * Bridge manager implementation
 */
export class BridgeManager<
  TActions extends Record<string, ActionDefinitionShape> = Record<string, ActionDefinitionShape>,
> {
  private config: {
    timeout: number;
    debug: boolean;
    maxConcurrentRequests: number;
    enableDeduplication: boolean;
    onError?: BridgeConfig['onError'];
    retry?: BridgeConfig['retry'];
    fallback?: BridgeConfig['fallback'];
  };
  private adapter: NativeAdapter;
  private callbacks: CallbackRegistry;
  private queue: MessageQueue;
  private middleware: MiddlewarePipeline;
  private eventHandlers = new Map<string, Set<EventHandler>>();
  /** Stores context per message id so the response phase can access it */
  private pendingContexts = new Map<string, MiddlewareContext>();
  /** Per-action interceptors: { 'camera.takePhoto': Middleware[] } */
  private actionInterceptors = new Map<string, Middleware[]>();
  /** Per-action timeouts: { 'camera.getInfo': 5000 } */
  private actionTimeouts = new Map<string, number>();
  /** Message event listener reference for cleanup */
  private messageListener?: (event: MessageEvent) => void;

  constructor(config: BridgeConfig = {}) {
    this.config = {
      timeout: config.timeout ?? 0,
      debug: config.debug ?? false,
      maxConcurrentRequests: config.maxConcurrentRequests ?? 100,
      enableDeduplication: config.enableDeduplication ?? true,
      onError: config.onError,
      retry: config.retry,
      fallback: config.fallback,
    };

    this.adapter = createNativeAdapter();

    if (!this.adapter.isAvailable() && this.config.fallback) {
      this.adapter = new FallbackAdapter(
        this.config.fallback as true | import('@webview-ts/shared').FallbackMap,
        (response) => this.handleResponse(response)
      );
    }

    this.callbacks = new CallbackRegistry();
    this.queue = new MessageQueue({
      enableDeduplication: this.config.enableDeduplication,
      maxSize: this.config.maxConcurrentRequests,
    });
    this.middleware = new MiddlewarePipeline();

    // Set up response handler
    this.setupResponseHandler();
  }

  /**
   * Call native action with retry support
   */
  async call<TAction extends ActionNames<TActions>>(
    action: TAction,
    payload?: InferPayload<TActions, TAction>,
    options?: BridgeCallOptions
  ): Promise<InferResponse<TActions, TAction>> {
    const retryConfig = options?.retry ?? this.config.retry;
    const maxAttempts = (retryConfig?.maxAttempts ?? 0) + 1;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.executeCall(action, payload, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const bridgeError: BridgeError = {
          code: (error as any)?.code ?? 'BRIDGE_ERROR',
          message: lastError.message,
          details: (error as any)?.details,
        };
        this.config.onError?.(bridgeError, {
          action: action as string,
          payload,
          attempt,
          timestamp: Date.now(),
        });
        if (attempt < maxAttempts && retryConfig) {
          const delay = retryConfig.exponentialBackoff
            ? retryConfig.delay * Math.pow(2, attempt - 1)
            : retryConfig.delay;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Execute a single call attempt using the onion middleware pipeline.
   *
   * The middleware wraps the core send/receive:
   *   middleware[0] → middleware[1] → ... → [send + wait] → ... → middleware[1] → middleware[0]
   *
   * A single MiddlewareContext is shared across the entire lifecycle,
   * so request-phase metadata is available in the response phase.
   */
  private async executeCall<TAction extends ActionNames<TActions>>(
    action: TAction,
    payload?: InferPayload<TActions, TAction>,
    options?: BridgeCallOptions
  ): Promise<InferResponse<TActions, TAction>> {
    if (!this.isAvailable()) {
      throw new Error('Native bridge not available');
    }

    const message: BridgeMessage = {
      id: generateMessageId(),
      action,
      payload,
      timestamp: Date.now(),
    };

    const ctx: MiddlewareContext = {
      request: message,
      startTime: Date.now(),
      metadata: new Map(),
    };

    // Store context so handleResponse can attach the response to it
    this.pendingContexts.set(message.id, ctx);

    try {
      // Core function: send message and wait for response
      const coreFn = async () => {
        this.queue.enqueue(ctx.request);

        const responsePromise = new Promise<BridgeResponse>((resolve, reject) => {
          // Priority: per-call > per-action > global (0 = disabled)
          const timeout =
            options?.timeout ?? this.actionTimeouts.get(action as string) ?? this.config.timeout;
          this.callbacks.register(
            ctx.request.id,
            resolve as (value: unknown) => void,
            reject,
            timeout
          );
        });

        this.adapter.send(ctx.request);

        const response = await responsePromise;

        if (!response.success) {
          const error = new Error(response.error?.message || 'Bridge call failed');
          (error as any).code = response.error?.code;
          (error as any).details = response.error?.details;
          throw error;
        }

        ctx.response = response;
        this.queue.complete(ctx.request.id);
      };

      // Initialize trace collection
      const traces: Array<{
        name: string;
        layer: string;
        plugin?: string;
        enterMs: number;
        exitMs: number;
        shortCircuit: boolean;
        shortCircuitReason?: string;
        error?: { message: string; stack?: string };
        logs?: string[];
        metadataChanges?: Record<string, unknown>;
      }> = [];
      ctx.metadata.set('__mwTraces', traces);
      const handlerStart = { value: 0 };
      const handlerEnd = { value: 0 };

      // Wrap core with per-action interceptors (inner layer),
      // then wrap that with global middleware (outer layer).
      // Result: Global MW → Plugin Interceptors → core → Plugin Interceptors → Global MW
      const interceptors = this.actionInterceptors.get(action as string);
      const trackedCore = async () => {
        handlerStart.value = performance.now();
        await coreFn();
        handlerEnd.value = performance.now();
      };
      const innerFn = interceptors?.length
        ? () => this.executeInterceptors(ctx, interceptors, trackedCore)
        : trackedCore;

      // Execute global middleware with trace wrapping
      await this.executeWithTracing(ctx, innerFn, traces);

      // Store handler timing
      if (handlerStart.value > 0) {
        ctx.metadata.set(
          '__handlerMs',
          Math.round((handlerEnd.value - handlerStart.value) * 100) / 100
        );
        ctx.metadata.set('__handlerSkipped', false);
      } else {
        ctx.metadata.set('__handlerSkipped', true);
      }

      return ctx.response?.data as InferResponse<TActions, TAction>;
    } finally {
      this.pendingContexts.delete(message.id);
    }
  }

  /**
   * Subscribe to native events
   */
  on<TPayload = unknown>(event: string, handler: EventHandler<TPayload>): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => {
      this.off(event, handler as EventHandler);
    };
  }

  /**
   * Unsubscribe from native events
   */
  off(event: string, handler?: EventHandler): void {
    if (!handler) {
      // Remove all handlers for this event
      this.eventHandlers.delete(event);
      return;
    }

    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  /**
   * Current connection mode
   */
  get connectionMode(): ConnectionMode {
    return this.adapter.connectionMode;
  }

  /**
   * Check if bridge is available
   */
  isAvailable(): boolean {
    return this.adapter.isAvailable();
  }

  /**
   * Get bridge configuration
   */
  getConfig(): BridgeConfig {
    return { ...this.config };
  }

  /**
   * Use global middleware (appended — runs as inner layer)
   */
  use(middleware: Middleware): void {
    this.middleware.use(middleware);
  }

  /**
   * Prepend global middleware (runs as outermost layer).
   * Useful for DevTools that must wrap all other middleware.
   */
  prepend(middleware: Middleware): void {
    this.middleware.prepend(middleware);
  }

  /**
   * Remove middleware by name
   */
  removeMiddleware(name: string): boolean {
    return this.middleware.remove(name);
  }

  /**
   * Register per-action interceptors (from plugin definitions)
   */
  registerInterceptors(interceptorMap: Record<string, Middleware[]>): void {
    for (const [action, interceptors] of Object.entries(interceptorMap)) {
      const existing = this.actionInterceptors.get(action) ?? [];
      this.actionInterceptors.set(action, [...existing, ...interceptors]);
    }
  }

  /**
   * Register per-action timeouts (from plugin definitions)
   */
  registerTimeouts(timeoutMap: Record<string, number>): void {
    for (const [action, timeout] of Object.entries(timeoutMap)) {
      this.actionTimeouts.set(action, timeout);
    }
  }

  /**
   * Execute global middleware pipeline with trace recording.
   * Wraps each middleware to measure enter/exit timing.
   */
  private async executeWithTracing(
    ctx: MiddlewareContext,
    core: () => Promise<void>,
    traces: Array<{
      name: string;
      layer: string;
      plugin?: string;
      enterMs: number;
      exitMs: number;
      shortCircuit: boolean;
      shortCircuitReason?: string;
      error?: { message: string; stack?: string };
      logs?: string[];
      metadataChanges?: Record<string, unknown>;
    }>
  ): Promise<void> {
    const middlewares = this.middleware.getAll();
    if (middlewares.length === 0) {
      return core();
    }

    let index = -1;
    let reachedCore = false;

    const dispatch = (i: number): Promise<void> => {
      if (i <= index) {
        return Promise.reject(new Error('next() called multiple times'));
      }
      index = i;
      if (i === middlewares.length) {
        reachedCore = true;
        return core();
      }

      const mw = middlewares[i];
      // Skip tracing for middleware that opts out (e.g. devtools itself)
      const skipTrace = (mw as any).__skipTrace === true;

      if (skipTrace) {
        return mw.fn(ctx, () => dispatch(i + 1));
      }

      const enterStart = performance.now();
      let enterEnd: number;

      // Snapshot metadata keys before this MW runs
      const keysBefore = new Set(ctx.metadata.keys());

      const recordTrace = (error?: Error) => {
        const exitEnd = performance.now();
        enterEnd = enterEnd ?? exitEnd;
        const didShortCircuit = !reachedCore && i === index;

        // Collect MW logs
        const logs = ctx.metadata.get(`__mwLog:${mw.name}`) as string[] | undefined;

        // Detect metadata changes (new or modified keys, excluding internal __ keys)
        const metadataChanges: Record<string, unknown> = {};
        for (const [key, value] of ctx.metadata.entries()) {
          if (key.startsWith('__')) continue;
          if (!keysBefore.has(key)) {
            metadataChanges[key] = value;
          }
        }

        traces.push({
          name: mw.name,
          layer: 'global',
          enterMs: Math.round((enterEnd - enterStart) * 100) / 100,
          exitMs: Math.round((exitEnd - enterEnd) * 100) / 100,
          shortCircuit: didShortCircuit,
          shortCircuitReason: didShortCircuit
            ? (ctx.metadata.get(`__shortCircuitReason:${mw.name}`) as string | undefined)
            : undefined,
          error: error ? { message: error.message, stack: error.stack } : undefined,
          logs,
          metadataChanges: Object.keys(metadataChanges).length > 0 ? metadataChanges : undefined,
        });
      };

      return mw
        .fn(ctx, () => {
          enterEnd = performance.now();
          return dispatch(i + 1);
        })
        .then(() => {
          recordTrace();
        })
        .catch((err: Error) => {
          recordTrace(err);
          throw err;
        });
    };

    await dispatch(0);
  }

  /**
   * Execute per-action interceptors as an onion pipeline (same model as global middleware).
   * Records timing traces in ctx.metadata for DevTools visualization.
   */
  private async executeInterceptors(
    ctx: MiddlewareContext,
    interceptors: Middleware[],
    core: () => Promise<void>
  ): Promise<void> {
    const fns: MiddlewareFn[] = interceptors.map((m) => m.fn);
    const traces = (ctx.metadata.get('__mwTraces') ?? []) as Array<{
      name: string;
      layer: string;
      plugin?: string;
      enterMs: number;
      exitMs: number;
      shortCircuit: boolean;
      shortCircuitReason?: string;
      error?: { message: string; stack?: string };
      logs?: string[];
      metadataChanges?: Record<string, unknown>;
    }>;
    ctx.metadata.set('__mwTraces', traces);

    const pluginName = ctx.request.action.split('.')[0];

    let index = -1;
    let reachedCore = false;

    const dispatch = (i: number): Promise<void> => {
      if (i <= index) {
        return Promise.reject(new Error('next() called multiple times'));
      }
      index = i;
      if (i === fns.length) {
        reachedCore = true;
        return core();
      }

      const name = interceptors[i].name;
      const enterStart = performance.now();
      let enterEnd: number;
      const keysBefore = new Set(ctx.metadata.keys());

      const recordTrace = (error?: Error) => {
        const exitEnd = performance.now();
        enterEnd = enterEnd ?? exitEnd;
        const didShortCircuit = !reachedCore && i === index;

        const logs = ctx.metadata.get(`__mwLog:${name}`) as string[] | undefined;

        const metadataChanges: Record<string, unknown> = {};
        for (const [key, value] of ctx.metadata.entries()) {
          if (key.startsWith('__')) continue;
          if (!keysBefore.has(key)) {
            metadataChanges[key] = value;
          }
        }

        traces.push({
          name,
          layer: 'plugin',
          plugin: pluginName,
          enterMs: Math.round((enterEnd - enterStart) * 100) / 100,
          exitMs: Math.round((exitEnd - enterEnd) * 100) / 100,
          shortCircuit: didShortCircuit,
          shortCircuitReason: didShortCircuit
            ? (ctx.metadata.get(`__shortCircuitReason:${name}`) as string | undefined)
            : undefined,
          error: error ? { message: error.message, stack: error.stack } : undefined,
          logs,
          metadataChanges: Object.keys(metadataChanges).length > 0 ? metadataChanges : undefined,
        });
      };

      return fns[i](ctx, () => {
        enterEnd = performance.now();
        return dispatch(i + 1);
      })
        .then(() => {
          recordTrace();
        })
        .catch((err: Error) => {
          recordTrace(err);
          throw err;
        });
    };

    await dispatch(0);
  }

  /**
   * Set up response handler from native via standard message event.
   * Host sends via postMessage(), web receives via 'message' listener.
   */
  private setupResponseHandler(): void {
    if (typeof window !== 'undefined') {
      this.messageListener = (event: MessageEvent) => {
        // Ignore non-bridge messages
        if (!event.data || typeof event.data !== 'string') return;

        let parsed: unknown;
        try {
          parsed = JSON.parse(event.data);
        } catch {
          return; // Not a JSON message — ignore
        }

        if (typeof parsed !== 'object' || parsed === null) return;

        const msg = parsed as Record<string, unknown>;

        if ('event' in msg) {
          this.handleEvent(msg as unknown as BridgeEvent);
        } else if ('id' in msg && 'success' in msg) {
          this.handleResponse(msg as unknown as BridgeResponse);
        }
      };

      window.addEventListener('message', this.messageListener);
    }
  }

  /**
   * Handle response from native.
   *
   * In the onion model, this simply resolves the pending callback.
   * The middleware's post-next() code runs automatically because
   * the response resolves the promise inside the core function.
   */
  private async handleResponse(response: BridgeResponse): Promise<void> {
    const callback = this.callbacks.has(response.id);
    if (!callback) {
      console.warn(`[ts-bridge] Received response for unknown message: ${response.id}`);
      return;
    }

    this.callbacks.handleResponse(response);
  }

  /**
   * Handle event from native
   */
  private handleEvent(event: BridgeEvent): void {
    const handlers = this.eventHandlers.get(event.event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event.payload);
        } catch (error) {
          console.error(`[ts-bridge] Error in event handler for '${event.event}':`, error);
        }
      });
    }
  }

  /**
   * Destroy bridge and clean up resources
   */
  destroy(): void {
    this.callbacks.clear();
    this.queue.clear();
    this.middleware.clear();
    this.eventHandlers.clear();
    this.pendingContexts.clear();
    this.actionInterceptors.clear();
    this.actionTimeouts.clear();
  }

  /**
   * Full disposal — removes message listener. Call only on true unmount.
   */
  dispose(): void {
    this.destroy();
    if (typeof window !== 'undefined' && this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = undefined;
    }
  }
}

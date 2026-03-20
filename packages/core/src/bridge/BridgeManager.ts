/**
 * Main bridge manager - orchestrates all bridge operations
 */
import { ActionStateManager } from './ActionStateManager';
import { CallbackRegistry } from './CallbackRegistry';
import { MessageQueue } from './MessageQueue';
import { executeOnionPipeline, type PipelineTrace } from './executeOnionPipeline';
import { createNativeAdapter, type NativeAdapter } from '../adapters/index';
import { FallbackAdapter } from '../adapters/FallbackAdapter';
import { MiddlewarePipeline } from '../middleware/MiddlewarePipeline';
import { generateMessageId } from '../utils/id-generator';
import { BridgeCallError, METADATA_KEYS, tryAutoDevTools } from '@webview-ts/shared';
import type {
  BridgeConfig,
  BridgeCallOptions,
  BridgeMessage,
  BridgeResponse,
  BridgeEvent,
  BridgeError,
  Middleware,
  MiddlewareContext,
  ActionDefinitionShape,
  ActionNames,
  InferPayload,
  InferResponse,
  ConnectionMode,
  FallbackMap,
  FallbackConfig,
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
  TEvents extends Record<string, unknown> = Record<string, unknown>,
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
  /** Global event interceptors (for devtools, logging, etc.) */
  private eventInterceptors = new Set<(event: string, payload: unknown) => void>();
  /** Stores context per message id so the response phase can access it */
  private pendingContexts = new Map<string, MiddlewareContext>();
  /** Per-action interceptors: { 'camera.takePhoto': Middleware[] } */
  private actionInterceptors = new Map<string, Middleware[]>();
  /** Per-action timeouts: { 'camera.getInfo': 5000 } */
  private actionTimeouts = new Map<string, number>();
  /** Message event listener reference for cleanup */
  private messageListener?: (event: MessageEvent) => void;
  /** Auto-devtools cleanup function */
  private _devtoolsCleanup?: () => void;

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

    const normalized = this.normalizeFallback(this.config.fallback);
    if (!this.adapter.isAvailable() && normalized.enabled) {
      this.adapter = new FallbackAdapter(normalized.handlers ?? true, (response) =>
        this.handleResponse(response)
      );
    }

    this.callbacks = new CallbackRegistry();
    this.queue = new MessageQueue({
      enableDeduplication: this.config.enableDeduplication,
      maxSize: this.config.maxConcurrentRequests,
    });
    this.middleware = new MiddlewarePipeline();
  }

  /**
   * Start listening for messages and connect to DevTools.
   * Must be called from useEffect (not useMemo/constructor) to avoid
   * Strict Mode double-invocation leaking event listeners.
   */
  connect(): void {
    if (this.messageListener) return; // already connected
    this.setupResponseHandler();
    this._devtoolsCleanup = tryAutoDevTools(this);
  }

  /**
   * Stop listening and disconnect DevTools, but preserve configuration
   * (middleware, handlers, interceptors). Safe to call connect() again after.
   */
  disconnect(): void {
    this._devtoolsCleanup?.();
    this._devtoolsCleanup = undefined;
    if (typeof window !== 'undefined' && this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = undefined;
    }
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
          code: error instanceof BridgeCallError ? error.code : 'UNKNOWN_ERROR',
          message: lastError.message,
          details:
            error instanceof BridgeCallError
              ? (error.details as Record<string, unknown> | undefined)
              : undefined,
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
          throw new BridgeCallError(
            response.error.message,
            response.error.code,
            response.error.details
          );
        }

        ctx.response = response;
        this.queue.complete(ctx.request.id);
      };

      // Initialize trace collection
      const allTraces: PipelineTrace[] = [];
      ctx.metadata.set(METADATA_KEYS.MW_TRACES, allTraces);
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

      const pluginName = (action as string).split('.')[0];
      const globalTraces = await executeOnionPipeline(
        this.middleware.getAll(),
        ctx,
        interceptors?.length
          ? async () => {
              const interceptorTraces = await executeOnionPipeline(interceptors, ctx, trackedCore, {
                tracing: true,
                layer: 'plugin',
                plugin: pluginName,
              });
              allTraces.push(...interceptorTraces);
            }
          : trackedCore,
        { tracing: true }
      );
      allTraces.unshift(...globalTraces);

      // Store handler timing
      if (handlerStart.value > 0) {
        ctx.metadata.set(
          METADATA_KEYS.HANDLER_MS,
          Math.round((handlerEnd.value - handlerStart.value) * 100) / 100
        );
        ctx.metadata.set(METADATA_KEYS.HANDLER_SKIPPED, false);
      } else {
        ctx.metadata.set(METADATA_KEYS.HANDLER_SKIPPED, true);
      }

      return (
        ctx.response && ctx.response.success ? ctx.response.data : undefined
      ) as InferResponse<TActions, TAction>;
    } finally {
      this.pendingContexts.delete(message.id);
    }
  }

  /**
   * Subscribe to native events
   */
  on<K extends string & keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => {
      this.off(event, handler as EventHandler<TEvents[K]>);
    };
  }

  /**
   * Unsubscribe from native events
   */
  off<K extends string & keyof TEvents>(event: K, handler?: EventHandler<TEvents[K]>): void {
    if (!handler) {
      // Remove all handlers for this event
      this.eventHandlers.delete(event);
      return;
    }

    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler);
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
   * Create a framework-agnostic state manager for a single action.
   * The returned manager can be consumed directly or via framework adapters.
   *
   * Pull model (React):            manager.subscribe + manager.getSnapshot
   * Push model (Vue/Svelte/Solid): manager.watch
   */
  createActionState<TAction extends ActionNames<TActions>>(
    action: TAction,
    defaultOptions?: BridgeCallOptions
  ): ActionStateManager<InferResponse<TActions, TAction>, InferPayload<TActions, TAction>> {
    return new ActionStateManager(
      (payload: InferPayload<TActions, TAction>, callOptions?: BridgeCallOptions) =>
        this.call(action, payload, callOptions ?? defaultOptions)
    );
  }

  /**
   * Normalize the various fallback config forms into a simple { enabled, handlers? } shape.
   */
  private normalizeFallback(raw: BridgeConfig['fallback']): {
    enabled: boolean;
    handlers?: FallbackMap;
  } {
    if (raw === true) return { enabled: true };
    if (raw === false || raw === undefined) return { enabled: false };
    if (typeof raw === 'object' && 'mode' in raw) {
      return { enabled: true, handlers: (raw as FallbackConfig).handlers };
    }
    return { enabled: true, handlers: raw as FallbackMap };
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
      console.warn(`[webview-ts] Received response for unknown message: ${response.id}`);
      return;
    }

    this.callbacks.handleResponse(response);
  }

  /**
   * Subscribe to all events (wildcard). Useful for devtools, logging, etc.
   * Returns an unsubscribe function.
   */
  onAnyEvent(handler: (event: string, payload: unknown) => void): () => void {
    this.eventInterceptors.add(handler);
    return () => {
      this.eventInterceptors.delete(handler);
    };
  }

  /**
   * Handle event from native
   */
  private handleEvent(event: BridgeEvent): void {
    for (const interceptor of this.eventInterceptors) {
      try {
        interceptor(event.event, event.payload);
      } catch {
        // devtools/logging interceptors should not break event handling
      }
    }

    const handlers = this.eventHandlers.get(event.event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event.payload);
        } catch (error) {
          console.error(`[webview-ts] Error in event handler for '${event.event}':`, error);
        }
      });
    }
  }

  /**
   * Disconnect listeners and clear runtime state (pending callbacks,
   * queued messages, in-flight contexts). Configuration (middleware,
   * event handlers, interceptors, timeouts) is preserved so the instance
   * can be reused after a React Strict Mode cleanup→remount cycle.
   */
  destroy(): void {
    this.disconnect();
    this.callbacks.clear();
    this.queue.clear();
    this.pendingContexts.clear();
  }

  /**
   * Full disposal — clears everything including configuration.
   * Call only on true unmount.
   */
  dispose(): void {
    this.destroy();
    this.middleware.clear();
    this.eventHandlers.clear();
    this.eventInterceptors.clear();
    this.actionInterceptors.clear();
    this.actionTimeouts.clear();
  }
}

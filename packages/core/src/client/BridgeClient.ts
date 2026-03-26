/**
 * Main bridge client - orchestrates all bridge operations
 */
import type { ClientAdapter } from '@webview-ts/shared';
import type {
  ActionMapBase,
  ActionNames,
  AnyPlugin,
  BridgeCallOptions,
  BridgeConfig,
  BridgeError,
  BridgeEvent,
  BridgeMessage,
  BridgeResponse,
  ConnectionMode,
  EventMapBase,
  FallbackMap,
  InferPayload,
  InferResponse,
  RequestInterceptor,
  ResponseInterceptor,
  RetryConfig,
  UseActionOptions,
} from '@webview-ts/shared';
import {
  ActionStateManager,
  BridgeCallError,
  generateSourceId,
  InterceptorManager,
  isBridgeEvent,
  isBridgeResponse,
  TARGET,
  tryAutoDevTools,
} from '@webview-ts/shared';

import { createClientAdapter } from '../adapters/createClientAdapter';
import { FallbackAdapter } from '../adapters/FallbackAdapter';
import { generateMessageId } from '../utils/id-generator';
import { CallbackRegistry } from './CallbackRegistry';

/**
 * Event handler type
 */
type EventHandler<T = unknown> = (payload: T) => void;

// ─── Lifecycle event types ───

export interface CallStartEvent {
  id: string;
  action: string;
  payload: unknown;
  timestamp: number;
}

export interface CallEndEvent {
  id: string;
  action: string;
  response: BridgeResponse;
  duration: number;
}

export interface CallErrorEvent {
  id: string;
  action: string;
  error: Error;
  duration: number;
}

type CallEventMap = {
  'call:start': CallStartEvent;
  'call:end': CallEndEvent;
  'call:error': CallErrorEvent;
};

/**
 * Bridge client implementation
 */
export class BridgeClient<
  TActions extends ActionMapBase = ActionMapBase,
  TEvents extends EventMapBase = EventMapBase,
> {
  private config: {
    timeout: number;
    onError?: BridgeConfig['onError'];
    retry?: BridgeConfig['retry'];
    fallback?: BridgeConfig['fallback'];
  };
  private adapter: ClientAdapter;
  private callbacks: CallbackRegistry;
  private eventHandlers = new Map<string, Set<(payload: unknown) => void>>();
  /** Maps original handler → wrapper stored in eventHandlers, for off() lookup */
  // eslint-disable-next-line @typescript-eslint/ban-types
  private handlerWrappers = new WeakMap<Function, (payload: unknown) => void>();
  /** Global event interceptors (for devtools, logging, etc.) */
  private eventInterceptors = new Set<(event: string, payload: unknown) => void>();
  /** Global interceptors (Axios-style) */
  readonly interceptors = {
    request: new InterceptorManager<BridgeMessage>(),
    response: new InterceptorManager<BridgeResponse>(),
  };
  /** Per-action request interceptors from plugins */
  private actionRequestInterceptors = new Map<string, RequestInterceptor[]>();
  /** Per-action response interceptors from plugins */
  private actionResponseInterceptors = new Map<string, ResponseInterceptor[]>();
  /** Lifecycle event listeners */
  private callListeners = {
    'call:start': new Set<(data: CallStartEvent) => void>(),
    'call:end': new Set<(data: CallEndEvent) => void>(),
    'call:error': new Set<(data: CallErrorEvent) => void>(),
  };
  /** Per-action timeouts: { 'camera.getInfo': 5000 } */
  private actionTimeouts = new Map<string, number>();
  /** Per-action retries from plugins */
  private actionRetries = new Map<string, RetryConfig>();
  /** Per-action caches from plugins */
  private actionCaches = new Map<string, number | boolean>();
  private readonly sourceId: string;
  /** Message event listener reference for cleanup */
  private messageListener?: (event: MessageEvent) => void;
  /** Auto-devtools cleanup function */
  private _devtoolsCleanup?: () => void;

  constructor(config: BridgeConfig = {}) {
    this.sourceId = generateSourceId(config.name);
    this.config = {
      timeout: config.timeout ?? 0,
      onError: config.onError,
      retry: config.retry,
      fallback: config.fallback,
    };

    this.adapter = createClientAdapter();

    const normalized = this.normalizeFallback(this.config.fallback);
    if (!this.adapter.isAvailable() && normalized.enabled) {
      // if adapter is notAvailable, adapter use FallbackAdapter.
      this.adapter = new FallbackAdapter(
        normalized.handlers ?? true,
        (response) => this.handleResponse(response),
        this.sourceId
      );
    }

    this.callbacks = new CallbackRegistry();
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
   * (handlers, interceptors). Safe to call connect() again after.
   */
  private disconnect(): void {
    this._devtoolsCleanup?.();
    this._devtoolsCleanup = undefined;
    if (typeof window !== 'undefined' && this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = undefined;
    }
  }

  /**
   * Subscribe to lifecycle events (call:start, call:end, call:error).
   * Returns an unsubscribe function.
   */
  onCall<K extends keyof CallEventMap>(
    event: K,
    handler: (data: CallEventMap[K]) => void
  ): () => void {
    const set = this.callListeners[event] as Set<(data: any) => void>;
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  }

  /**
   * Call native action with retry support
   */
  async call<TAction extends ActionNames<TActions>>(
    action: TAction,
    payload?: InferPayload<TActions, TAction>,
    options?: BridgeCallOptions
  ): Promise<InferResponse<TActions, TAction>> {
    const retryConfig =
      options?.retry ?? this.actionRetries.get(action as string) ?? this.config.retry;
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
   * Execute a single call attempt using the linear interceptor pipeline.
   *
   * Flow: global request interceptors -> per-action request interceptors
   *       -> [send + wait] ->
   *       per-action response interceptors -> global response interceptors
   */
  private async executeCall<TAction extends ActionNames<TActions>>(
    action: TAction,
    payload?: InferPayload<TActions, TAction>,
    options?: BridgeCallOptions
  ): Promise<InferResponse<TActions, TAction>> {
    if (!this.isAvailable()) {
      throw new BridgeCallError('Native bridge not available', 'NATIVE_UNAVAILABLE');
    }

    let message: BridgeMessage = {
      id: generateMessageId(),
      action,
      payload,
      timestamp: Date.now(),
      sourceId: this.sourceId,
      targetId: TARGET.HOST,
    };

    const startTime = Date.now();

    // Emit call:start
    for (const listener of this.callListeners['call:start']) {
      try {
        listener({ id: message.id, action: action as string, payload, timestamp: startTime });
      } catch {
        /* listeners must not break the call */
      }
    }

    try {
      // Run global request interceptors
      message = await this.interceptors.request.execute(message);

      // Run per-action request interceptors
      const actionReqInterceptors = this.actionRequestInterceptors.get(action as string);
      if (actionReqInterceptors) {
        for (const interceptor of actionReqInterceptors) {
          message = await interceptor.fn(message);
        }
      }

      // Core: send and wait for response
      const responsePromise = new Promise<BridgeResponse>((resolve, reject) => {
        const timeout =
          options?.timeout ?? this.actionTimeouts.get(action as string) ?? this.config.timeout;
        this.callbacks.register(message.id, resolve as (value: unknown) => void, reject, timeout);
      });
      this.adapter.send(message);
      let response = await responsePromise;

      if (!response.success) {
        throw new BridgeCallError(
          response.error.message,
          response.error.code,
          response.error.details
        );
      }

      // Run per-action response interceptors
      const actionResInterceptors = this.actionResponseInterceptors.get(action as string);
      if (actionResInterceptors) {
        for (const interceptor of actionResInterceptors) {
          response = await interceptor.fn(response);
        }
      }

      // Run global response interceptors
      response = await this.interceptors.response.execute(response);

      // Emit call:end
      const duration = Date.now() - startTime;
      for (const listener of this.callListeners['call:end']) {
        try {
          listener({ id: message.id, action: action as string, response, duration });
        } catch {
          /* listeners must not break the call */
        }
      }

      return (response.success ? response.data : undefined) as InferResponse<TActions, TAction>;
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));

      // Emit call:error
      for (const listener of this.callListeners['call:error']) {
        try {
          listener({ id: message.id, action: action as string, error: err, duration });
        } catch {
          /* listeners must not break the call */
        }
      }

      throw error;
    }
  }

  /**
   * Subscribe to native events
   */
  on<K extends string & keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    const wrapper = (payload: unknown) => handler(payload as TEvents[K]);
    this.handlerWrappers.set(handler, wrapper);
    this.eventHandlers.get(event)!.add(wrapper);

    return () => {
      this.off(event, handler);
    };
  }

  /**
   * Unsubscribe from native events
   */
  off<K extends string & keyof TEvents>(event: K, handler?: EventHandler<TEvents[K]>): void {
    if (!handler) {
      this.eventHandlers.delete(event);
      return;
    }

    const wrapper = this.handlerWrappers.get(handler);
    if (wrapper) {
      const handlers = this.eventHandlers.get(event);
      handlers?.delete(wrapper);
      if (handlers?.size === 0) {
        this.eventHandlers.delete(event);
      }
      this.handlerWrappers.delete(handler);
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
   * Register per-action timeouts (from plugin definitions)
   */
  private registerTimeouts(timeoutMap: Record<string, number>): void {
    for (const [action, timeout] of Object.entries(timeoutMap)) {
      this.actionTimeouts.set(action, timeout);
    }
  }

  /**
   * Register per-action retries (from plugin definitions)
   */
  private registerRetries(retryMap: Record<string, RetryConfig>): void {
    for (const [action, retry] of Object.entries(retryMap)) {
      this.actionRetries.set(action, retry);
    }
  }

  /**
   * Register per-action caches (from plugin definitions)
   */
  private registerCaches(cacheMap: Record<string, number | boolean>): void {
    for (const [action, cache] of Object.entries(cacheMap)) {
      this.actionCaches.set(action, cache);
    }
  }

  /**
   * Apply plugins and global interceptors in one call.
   * Replaces the duplicated registration loops in framework adapters (React, Vue, etc.).
   */
  applyPlugins(
    plugins?: AnyPlugin[],
    interceptors?: {
      request?: RequestInterceptor[];
      response?: ResponseInterceptor[];
    }
  ): void {
    if (plugins) {
      for (const plugin of plugins) {
        // Register per-action request interceptors
        if (plugin.requestInterceptors && Object.keys(plugin.requestInterceptors).length > 0) {
          for (const [action, ints] of Object.entries(plugin.requestInterceptors)) {
            const existing = this.actionRequestInterceptors.get(action) ?? [];
            this.actionRequestInterceptors.set(action, [...existing, ...ints]);
          }
        }
        // Register per-action response interceptors
        if (plugin.responseInterceptors && Object.keys(plugin.responseInterceptors).length > 0) {
          for (const [action, ints] of Object.entries(plugin.responseInterceptors)) {
            const existing = this.actionResponseInterceptors.get(action) ?? [];
            this.actionResponseInterceptors.set(action, [...existing, ...ints]);
          }
        }
        // timeouts, retries, caches — unchanged
        if (plugin.timeouts && Object.keys(plugin.timeouts).length > 0) {
          this.registerTimeouts(plugin.timeouts);
        }
        if (plugin.retries && Object.keys(plugin.retries).length > 0) {
          this.registerRetries(plugin.retries);
        }
        if (plugin.caches && Object.keys(plugin.caches).length > 0) {
          this.registerCaches(plugin.caches);
        }
      }
    }
    if (interceptors?.request) {
      for (const int of interceptors.request) {
        this.interceptors.request.use(int);
      }
    }
    if (interceptors?.response) {
      for (const int of interceptors.response) {
        this.interceptors.response.use(int);
      }
    }
  }

  /**
   * Create a framework-agnostic state manager for a single action.
   * The returned manager can be consumed directly or via framework adapters.
   *
   * Pull model (React):            manager.subscribe + manager.getSnapshot
   * Push model (Vue/Svelte/Solid): manager.watch
   *
   * Option resolve order (shallow merge, narrower wins):
   *   per-call (execute options) > per-action (useAction) > plugin (action marker) > global (BridgeConfig)
   */
  createActionState<TAction extends ActionNames<TActions>>(
    action: TAction,
    defaultOptions?: UseActionOptions
  ): ActionStateManager<InferResponse<TActions, TAction>, InferPayload<TActions, TAction>> {
    const actionKey = action as string;

    // Resolve cache: per-action > plugin > (no global cache)
    const resolvedCache = defaultOptions?.cache ?? this.actionCaches.get(actionKey);

    // Resolve bridge call defaults: per-action > plugin > global (applied when no per-call options)
    const resolvedBridgeDefaults: BridgeCallOptions = {
      timeout: defaultOptions?.timeout ?? this.actionTimeouts.get(actionKey) ?? this.config.timeout,
      retry: defaultOptions?.retry ?? this.actionRetries.get(actionKey) ?? this.config.retry,
    };

    return new ActionStateManager(
      (payload: InferPayload<TActions, TAction>, callOptions?: BridgeCallOptions) =>
        this.call(
          action,
          payload,
          callOptions ? { ...resolvedBridgeDefaults, ...callOptions } : resolvedBridgeDefaults
        ),
      resolvedCache
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
    return { enabled: true, handlers: raw };
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

        if (isBridgeEvent(parsed)) {
          this.handleEvent(parsed);
        } else if (isBridgeResponse(parsed)) {
          this.handleResponse(parsed);
        }
      };

      window.addEventListener('message', this.messageListener);
    }
  }

  /**
   * Handle response from native.
   *
   * This simply resolves the pending callback.
   * The response resolves the promise inside the core function of executeCall.
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
   * Disconnect listeners and clear runtime state (pending callbacks).
   * Configuration (event handlers, interceptors, timeouts) is preserved
   * so the instance can be reused after a React Strict Mode cleanup->remount cycle.
   */
  destroy(): void {
    this.disconnect();
    this.callbacks.clear();
  }

  /**
   * Full disposal — clears everything including configuration.
   * Call only on true unmount.
   */
  dispose(): void {
    this.destroy();
    this.interceptors.request.clear();
    this.interceptors.response.clear();
    this.actionRequestInterceptors.clear();
    this.actionResponseInterceptors.clear();
    this.eventHandlers.clear();
    this.eventInterceptors.clear();
    this.actionTimeouts.clear();
    this.actionRetries.clear();
    this.actionCaches.clear();
  }
}

/**
 * Main bridge manager - orchestrates all bridge operations
 */
import { CallbackRegistry } from './CallbackRegistry';
import { MessageQueue } from './MessageQueue';
import { createNativeAdapter, type NativeAdapter } from '../adapters/index';
import { FallbackAdapter } from '../adapters/FallbackAdapter';
import { MiddlewarePipeline } from '../middleware/MiddlewarePipeline';
import { PluginRegistry } from '../plugins/PluginRegistry';
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
  WebPlugin,
  ActionDefinitionShape,
  ActionNames,
  InferPayload,
  InferResponse,
} from '@ts-bridge/shared';
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
  private plugins: PluginRegistry;
  private eventHandlers = new Map<string, Set<EventHandler>>();
  /** Stores context per message id so the response phase can access it */
  private pendingContexts = new Map<string, MiddlewareContext>();
  /** Message event listener reference for cleanup */
  private messageListener?: (event: MessageEvent) => void;

  constructor(config: BridgeConfig = {}) {
    this.config = {
      timeout: config.timeout ?? 30000,
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
        this.config.fallback as true | import('@ts-bridge/shared').FallbackMap,
        (response) => this.handleResponse(response)
      );
    }

    this.callbacks = new CallbackRegistry();
    this.queue = new MessageQueue({
      enableDeduplication: this.config.enableDeduplication,
      maxSize: this.config.maxConcurrentRequests,
    });
    this.middleware = new MiddlewarePipeline();
    this.plugins = new PluginRegistry();

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
      await this.middleware.execute(ctx, async () => {
        // === Core: send message and wait for response ===
        this.queue.enqueue(ctx.request);

        const responsePromise = new Promise<BridgeResponse>((resolve, reject) => {
          const timeout = options?.timeout ?? this.config.timeout;
          this.callbacks.register(ctx.request.id, resolve as (value: unknown) => void, reject, timeout);
        });

        this.adapter.send(ctx.request);

        // CallbackRegistry now resolves with full BridgeResponse
        const response = await responsePromise;

        // Error handling: reject failed responses
        if (!response.success) {
          const error = new Error(response.error?.message || 'Bridge call failed');
          (error as any).code = response.error?.code;
          (error as any).details = response.error?.details;
          throw error;
        }

        ctx.response = response;
        this.queue.complete(ctx.request.id);
      });

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
   * Use middleware
   */
  use(middleware: Middleware): void {
    this.middleware.use(middleware);
  }

  /**
   * Register plugin
   */
  registerPlugin<T = unknown>(plugin: WebPlugin<T>): void {
    this.plugins.register(plugin);
    plugin.initialize(this as unknown as import('@ts-bridge/shared').Bridge).catch((error) => {
      console.error(`[ts-bridge] Failed to initialize plugin '${plugin.metadata.name}':`, error);
    });
  }

  /**
   * Unregister plugin
   */
  unregisterPlugin(pluginName: string): void {
    this.plugins.unregister(pluginName);
  }

  /**
   * Get plugin
   */
  getPlugin(pluginName: string): WebPlugin | undefined {
    return this.plugins.get(pluginName);
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
    this.plugins.clear();
    this.eventHandlers.clear();
    this.pendingContexts.clear();

    if (typeof window !== 'undefined' && this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = undefined;
    }
  }
}

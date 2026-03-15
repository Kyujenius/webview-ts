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
   * Execute a single call attempt
   */
  private async executeCall<TAction extends ActionNames<TActions>>(
    action: TAction,
    payload?: InferPayload<TActions, TAction>,
    options?: BridgeCallOptions
  ): Promise<InferResponse<TActions, TAction>> {
    // Check if bridge is available
    if (!this.isAvailable()) {
      throw new Error('Native bridge not available');
    }

    // Create message
    const message: BridgeMessage = {
      id: generateMessageId(),
      action,
      payload,
      timestamp: Date.now(),
    };

    // Create middleware context
    const context: MiddlewareContext = {
      request: message,
      startTime: Date.now(),
      metadata: {},
    };

    try {
      // Execute request middleware
      await this.middleware.executeRequest(context);

      // Add to queue
      this.queue.enqueue(message);

      // Create promise for response
      const responsePromise = new Promise<InferResponse<TActions, TAction>>((resolve, reject) => {
        const timeout = options?.timeout ?? this.config.timeout;
        this.callbacks.register(message.id, resolve as (value: unknown) => void, reject, timeout);
      });

      // Send message
      this.adapter.send(message);

      // Wait for response
      const response = await responsePromise;

      // Mark as complete
      this.queue.complete(message.id);

      return response;
    } catch (error) {
      // Execute error middleware
      await this.middleware.executeError(context, error as Error);
      throw error;
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
  use(middleware: import('@ts-bridge/shared').Middleware): void {
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
   * Set up response handler from native
   */
  private setupResponseHandler(): void {
    // Set up global response handler
    if (typeof window !== 'undefined') {
      (window as any).__tsBridgeResponseHandler = (response: BridgeResponse | BridgeEvent) => {
        // Check if it's an event or response
        if ('event' in response) {
          this.handleEvent(response as BridgeEvent);
        } else {
          this.handleResponse(response as BridgeResponse);
        }
      };
    }
  }

  /**
   * Handle response from native
   */
  private async handleResponse(response: BridgeResponse): Promise<void> {
    // Create context for response middleware
    const callback = this.callbacks.has(response.id);
    if (!callback) {
      console.warn(`[ts-bridge] Received response for unknown message: ${response.id}`);
      return;
    }

    const context: MiddlewareContext = {
      request: { id: response.id, action: '', timestamp: 0 } as BridgeMessage,
      response,
      startTime: 0,
      metadata: {},
    };

    try {
      // Execute response middleware
      await this.middleware.executeResponse(context);

      // Handle callback
      this.callbacks.handleResponse(response);
    } catch (error) {
      console.error('[ts-bridge] Error handling response:', error);
    }
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
  }
}

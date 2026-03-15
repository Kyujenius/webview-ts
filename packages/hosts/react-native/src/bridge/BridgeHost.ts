import type {
  BridgeMessage,
  BridgeResponse,
  BridgeError,
  BridgeEvent,
  BridgeHost as IBridgeHost,
  Middleware,
  MiddlewareContext,
  NativePlugin,
} from '@ts-bridge/shared';
import { MiddlewarePipeline } from '@ts-bridge/shared';

/**
 * Configuration for the BridgeHost
 */
export interface BridgeHostConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Maximum time to process a request (ms) */
  timeout?: number;
  /** Custom error handler */
  onError?: (error: Error, context?: unknown) => void;
}

/**
 * Action handler function type
 */
export type ActionHandler<TPayload = unknown, TResponse = unknown> = (
  payload: TPayload,
  context: RequestContext
) => Promise<TResponse> | TResponse;

/**
 * Request context passed to action handlers
 */
export interface RequestContext {
  messageId: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

/**
 * BridgeHost - React Native side bridge implementation.
 * Uses the same Koa-style onion middleware as the web-side BridgeManager.
 */
export class BridgeHost implements IBridgeHost {
  private config: Required<BridgeHostConfig>;
  private handlers: Map<string, ActionHandler>;
  private plugins: Map<string, NativePlugin>;
  private pipeline: MiddlewarePipeline;
  private messageCallback?: (message: string) => void;

  constructor(config: BridgeHostConfig = {}) {
    this.config = {
      debug: config.debug ?? false,
      timeout: config.timeout ?? 30000,
      onError: config.onError ?? ((error) => console.error('[BridgeHost]', error)),
    };
    this.handlers = new Map();
    this.plugins = new Map();
    this.pipeline = new MiddlewarePipeline();
  }

  getConfig(): Required<BridgeHostConfig> {
    return { ...this.config };
  }

  /** Add middleware — same MiddlewareFn type as web side */
  use(middleware: Middleware): void {
    this.pipeline.use(middleware);
  }

  registerHandler<TPayload = unknown, TResponse = unknown>(
    action: string,
    handler: (payload: TPayload) => Promise<TResponse>
  ): void {
    if (this.handlers.has(action)) {
      throw new Error(`Action '${action}' is already registered`);
    }
    this.handlers.set(action, handler as ActionHandler);
    this.log('debug', `Registered action: ${action}`);
  }

  unregisterHandler(action: string): void {
    this.handlers.delete(action);
    this.log('debug', `Unregistered action: ${action}`);
  }

  registerAction<TPayload = unknown, TResponse = unknown>(
    action: string,
    handler: ActionHandler<TPayload, TResponse>
  ): void {
    this.registerHandler(action, handler as (payload: TPayload) => Promise<TResponse>);
  }

  unregisterAction(action: string): void {
    this.unregisterHandler(action);
  }

  registerPlugin(plugin: NativePlugin): void {
    const { name } = plugin.metadata;
    if (this.plugins.has(name)) {
      throw new Error(`Plugin '${name}' is already registered`);
    }
    this.plugins.set(name, plugin);
    plugin.initialize(this).catch((error) => {
      this.config.onError(error, { plugin: name });
    });
    this.log('debug', `Registered plugin: ${name}`);
  }

  unregisterPlugin(pluginName: string): void {
    const plugin = this.plugins.get(pluginName);
    if (plugin && plugin.destroy) {
      plugin.destroy().catch((error) => {
        this.config.onError(error, { plugin: pluginName });
      });
    }
    this.plugins.delete(pluginName);
    this.log('debug', `Unregistered plugin: ${pluginName}`);
  }

  getPlugin<T extends NativePlugin = NativePlugin>(pluginName: string): T | undefined {
    return this.plugins.get(pluginName) as T | undefined;
  }

  setMessageCallback(callback: (message: string) => void): void {
    this.messageCallback = callback;
  }

  /**
   * Handle incoming message from WebView.
   * Runs through the onion middleware pipeline, then executes the handler.
   */
  async handleMessage(message: BridgeMessage): Promise<BridgeResponse> {
    this.log('debug', `Received message: ${message.action}`, message);

    const ctx: MiddlewareContext = {
      request: message,
      startTime: Date.now(),
      metadata: new Map(),
    };

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);
    });

    try {
      await Promise.race([
        this.pipeline.execute(ctx, async () => {
          // Core: find and execute the action handler
          const handler = this.handlers.get(message.action);
          if (!handler) {
            throw new Error(`No handler registered for action: ${message.action}`);
          }

          const requestContext: RequestContext = {
            messageId: message.id,
            timestamp: message.timestamp,
            metadata: Object.fromEntries(ctx.metadata),
          };

          const data = await Promise.resolve(handler(message.payload, requestContext));

          ctx.response = {
            id: message.id,
            success: true,
            data,
            timestamp: Date.now(),
          };
        }),
        timeoutPromise,
      ]);

      return ctx.response!;
    } catch (error) {
      const bridgeError: BridgeError = {
        code: error instanceof Error && 'code' in error ? String(error.code) : 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : String(error),
        details: error instanceof Error ? { stack: error.stack } : undefined,
      };

      this.config.onError(error instanceof Error ? error : new Error(String(error)), {
        message,
      });

      return {
        id: message.id,
        success: false,
        error: bridgeError,
        timestamp: Date.now(),
      };
    }
  }

  async handleMessageString(messageJson: string): Promise<void> {
    try {
      const message = JSON.parse(messageJson) as BridgeMessage;
      const response = await this.handleMessage(message);
      this.sendResponse(response);
    } catch (error) {
      this.config.onError(error instanceof Error ? error : new Error(String(error)), {
        messageJson,
      });
    }
  }

  sendEvent<TPayload = unknown>(event: string, payload: TPayload): void {
    const eventMessage: BridgeEvent<TPayload> = {
      event,
      payload,
      timestamp: Date.now(),
    };
    this.sendToWebView(eventMessage);
    this.log('debug', `Sent event: ${event}`, eventMessage);
  }

  emit<TPayload = unknown>(event: string, payload?: TPayload): void {
    if (payload !== undefined) {
      this.sendEvent(event, payload);
    } else {
      this.sendEvent(event, undefined as unknown as TPayload);
    }
  }

  private sendResponse(response: BridgeResponse): void {
    this.sendToWebView(response);
    this.log('debug', `Sent response for message: ${response.id}`, response);
  }

  private sendToWebView(message: BridgeResponse | BridgeEvent): void {
    if (!this.messageCallback) {
      throw new Error('Message callback not set. Call setMessageCallback() first.');
    }
    const messageJson = JSON.stringify(message);
    this.messageCallback(messageJson);
  }

  destroy(): void {
    for (const [name, plugin] of this.plugins.entries()) {
      if (plugin.destroy) {
        plugin.destroy().catch((error) => {
          this.config.onError(error, { plugin: name });
        });
      }
    }
    this.handlers.clear();
    this.plugins.clear();
    this.pipeline.clear();
    this.messageCallback = undefined;
    this.log('debug', 'BridgeHost destroyed');
  }

  private log(level: 'debug' | 'error', message: string, data?: unknown): void {
    if (!this.config.debug && level === 'debug') return;
    const prefix = '[BridgeHost]';
    if (data !== undefined) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }
}

import type {
  BridgeMessage,
  BridgeResponse,
  BridgeError,
  BridgeEvent,
  Middleware,
  MiddlewareContext,
  HostAdapter,
} from '@webview-ts/shared';
import {
  MiddlewarePipeline,
  MetadataMap,
  toBridgeErrorCode,
  BridgeCallError,
} from '@webview-ts/shared';

/**
 * Configuration for the BridgeHost
 */
export interface BridgeHostConfig {
  /** Maximum time to process a request (ms). 0 = disabled (default) */
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
 * BridgeHost - Native side bridge implementation.
 * Uses the same Koa-style onion middleware as the web-side BridgeClient.
 */
export class BridgeHost {
  private config: Required<BridgeHostConfig>;
  private handlers: Map<string, ActionHandler>;
  private pipeline: MiddlewarePipeline;
  private adapter?: HostAdapter;

  constructor(config: BridgeHostConfig = {}) {
    this.config = {
      timeout: config.timeout ?? 0,
      onError: config.onError ?? ((error) => console.error('[BridgeHost]', error)),
    };
    this.handlers = new Map();
    this.pipeline = new MiddlewarePipeline();
  }

  getConfig(): Required<BridgeHostConfig> {
    return { ...this.config };
  }

  /** Add middleware — same MiddlewareFn type as web side */
  use(middleware: Middleware): void {
    this.pipeline.use(middleware);
  }

  /** Prepend middleware (runs as outermost layer) */
  prepend(middleware: Middleware): void {
    this.pipeline.prepend(middleware);
  }

  /** Remove middleware by name */
  removeMiddleware(name: string): boolean {
    return this.pipeline.remove(name);
  }

  registerHandler<TPayload = unknown, TResponse = unknown>(
    action: string,
    handler: (payload: TPayload, context: RequestContext) => Promise<TResponse> | TResponse
  ): void {
    if (this.handlers.has(action)) {
      throw new Error(`Action '${action}' is already registered`);
    }
    this.handlers.set(action, handler as ActionHandler);
  }

  unregisterHandler(action: string): void {
    this.handlers.delete(action);
  }

  registerAction<TPayload = unknown, TResponse = unknown>(
    action: string,
    handler: ActionHandler<TPayload, TResponse>
  ): void {
    this.registerHandler(action, handler);
  }

  unregisterAction(action: string): void {
    this.unregisterHandler(action);
  }

  /**
   * Attach a HostAdapter for bidirectional communication.
   * Returns a detach function.
   */
  attach(adapter: HostAdapter): () => void {
    this.adapter = adapter;
    const unsub = adapter.onMessage((json) => this.handleMessageString(json));
    return () => {
      unsub();
      this.adapter = undefined;
    };
  }

  /**
   * Handle incoming message from WebView.
   * Runs through the onion middleware pipeline, then executes the handler.
   */
  async handleMessage(message: BridgeMessage): Promise<BridgeResponse> {
    const ctx: MiddlewareContext = {
      request: message,
      startTime: Date.now(),
      metadata: new MetadataMap(),
    };

    const executeFn = () =>
      this.pipeline.execute(ctx, async () => {
        // Core: find and execute the action handler
        const handler = this.handlers.get(message.action);
        if (!handler) {
          throw new BridgeCallError(
            `No handler registered for action: ${message.action}`,
            'HANDLER_NOT_FOUND',
            { action: message.action }
          );
        }

        const requestContext: RequestContext = {
          messageId: message.id,
          timestamp: message.timestamp,
          metadata: Object.fromEntries(ctx.metadata.entries()),
        };

        const data = await Promise.resolve(handler(message.payload, requestContext));

        ctx.response = {
          id: message.id,
          success: true,
          data,
          timestamp: Date.now(),
          sourceId: 'host',
          targetId: message.sourceId,
        };
      });

    try {
      if (this.config.timeout > 0) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Request timeout after ${this.config.timeout}ms`));
          }, this.config.timeout);
        });
        await Promise.race([executeFn(), timeoutPromise]);
      } else {
        await executeFn();
      }

      return ctx.response!;
    } catch (error) {
      const bridgeError: BridgeError = {
        code:
          error instanceof BridgeCallError
            ? error.code
            : toBridgeErrorCode(
                error instanceof Error && 'code' in error ? error.code : 'HANDLER_ERROR'
              ),
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
        sourceId: 'host',
        targetId: message.sourceId,
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
      sourceId: 'host',
    };
    this.sendToWebView(eventMessage);
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
  }

  private sendToWebView(message: BridgeResponse | BridgeEvent): void {
    if (!this.adapter) {
      throw new Error('No adapter attached. Call attach(adapter) first.');
    }
    const messageJson = JSON.stringify(message);
    this.adapter.send(messageJson);
  }

  destroy(): void {
    this.handlers.clear();
    this.pipeline.clear();
    this.adapter = undefined;
  }
}

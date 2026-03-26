import type {
  BridgeError,
  BridgeEvent,
  BridgeMessage,
  BridgeResponse,
  ConnectionRegistry,
  HostAdapter,
  Middleware,
  MiddlewareContext,
} from '@webview-ts/shared';
import {
  BridgeCallError,
  isBridgeMessage,
  MetadataMap,
  MiddlewarePipeline,
  TARGET,
  toBridgeErrorCode,
} from '@webview-ts/shared';

/**
 * Configuration for the BridgeHost
 */
export interface BridgeHostConfig {
  /** Maximum time to process a request (ms). 0 = disabled (default) */
  timeout?: number;
  /** Custom error handler */
  onError?: (error: Error, context?: unknown) => void;
  /** ConnectionRegistry for multi-webview event routing */
  registry?: ConnectionRegistry;
}

/**
 * Options for sendEvent targeting
 */
export interface SendEventOptions {
  /** Target WebView sourceId, or '__broadcast__' for all. Defaults to attached adapter. */
  target?: string;
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
  private config: Required<Omit<BridgeHostConfig, 'registry'>>;
  private registry?: ConnectionRegistry;
  private handlers: Map<string, ActionHandler>;
  private pipeline: MiddlewarePipeline;
  private adapter?: HostAdapter;

  constructor(config: BridgeHostConfig = {}) {
    this.config = {
      timeout: config.timeout ?? 0,
      onError: config.onError ?? ((error) => console.error('[BridgeHost]', error)),
    };
    this.registry = config.registry;
    this.handlers = new Map();
    this.pipeline = new MiddlewarePipeline();
  }

  getConfig(): Required<Omit<BridgeHostConfig, 'registry'>> {
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
    this.handlers.set(action, (payload: unknown, ctx: RequestContext) =>
      handler(payload as TPayload, ctx)
    );
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
            reject(
              new BridgeCallError(`Request timeout after ${this.config.timeout}ms`, 'TIMEOUT')
            );
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
      const parsed: unknown = JSON.parse(messageJson);
      if (!isBridgeMessage(parsed)) {
        this.config.onError(new Error('Invalid BridgeMessage: missing required fields'), {
          messageJson,
        });
        return;
      }
      const response = await this.handleMessage(parsed);
      this.sendResponse(response);
    } catch (error) {
      this.config.onError(error instanceof Error ? error : new Error(String(error)), {
        messageJson,
      });
    }
  }

  sendEvent<TPayload = unknown>(
    event: string,
    payload?: TPayload,
    options?: SendEventOptions
  ): void {
    const eventMessage: BridgeEvent<TPayload> = {
      event,
      payload: payload as TPayload,
      timestamp: Date.now(),
      sourceId: 'host',
    };
    const messageJson = JSON.stringify(eventMessage);

    if (options?.target && this.registry) {
      if (options.target === TARGET.BROADCAST) {
        this.registry.broadcast(messageJson);
      } else {
        this.registry.sendTo(options.target, messageJson);
      }
      return;
    }

    this.sendViaAdapter(messageJson);
  }

  emit<TPayload = unknown>(event: string, payload?: TPayload, options?: SendEventOptions): void {
    this.sendEvent(event, payload, options);
  }

  /**
   * Broadcast an event to all connected WebViews via ConnectionRegistry.
   * Requires registry to be configured.
   */
  broadcastEvent<TPayload = unknown>(event: string, payload: TPayload): void {
    this.sendEvent(event, payload, { target: TARGET.BROADCAST });
  }

  private sendResponse(response: BridgeResponse): void {
    const messageJson = JSON.stringify(response);

    // Route response to the correct WebView via registry if available
    if (this.registry && response.targetId) {
      try {
        this.registry.sendTo(response.targetId, messageJson);
        return;
      } catch {
        // targetId not in registry — fall back to attached adapter
      }
    }

    this.sendViaAdapter(messageJson);
  }

  private sendViaAdapter(messageJson: string): void {
    if (!this.adapter) {
      throw new Error('No adapter attached. Call attach(adapter) first.');
    }
    this.adapter.send(messageJson);
  }

  /**
   * Detach adapter (runtime cleanup). Handlers and middleware are preserved
   * so the instance can be reattached.
   */
  destroy(): void {
    this.adapter = undefined;
  }

  /**
   * Full disposal — clears everything including handlers and middleware.
   */
  dispose(): void {
    this.destroy();
    this.handlers.clear();
    this.pipeline.clear();
  }
}

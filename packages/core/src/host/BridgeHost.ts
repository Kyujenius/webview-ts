import type {
  BridgeError,
  BridgeEvent,
  BridgeMessage,
  BridgeResponse,
  CallEndEvent,
  CallErrorEvent,
  CallEventMap,
  CallStartEvent,
  ConnectionRegistry,
  HostAdapter,
} from '@webview-ts/shared';
import { BridgeCallError, isBridgeMessage, TARGET, toBridgeErrorCode } from '@webview-ts/shared';

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
}

/**
 * BridgeHost - Native side bridge implementation.
 */
export class BridgeHost {
  private config: Required<Omit<BridgeHostConfig, 'registry'>>;
  private registry?: ConnectionRegistry;
  private handlers: Map<string, ActionHandler>;
  private adapter?: HostAdapter;
  /** Lifecycle event listeners — mirrors BridgeClient.onCall */
  private callListeners = {
    'call:start': new Set<(data: CallStartEvent) => void>(),
    'call:end': new Set<(data: CallEndEvent) => void>(),
    'call:error': new Set<(data: CallErrorEvent) => void>(),
  };

  constructor(config: BridgeHostConfig = {}) {
    this.config = {
      timeout: config.timeout ?? 0,
      onError: config.onError ?? ((error) => console.error('[BridgeHost]', error)),
    };
    this.registry = config.registry;
    this.handlers = new Map();
  }

  /**
   * Subscribe to lifecycle events (call:start, call:end, call:error).
   * Symmetric with BridgeClient.onCall — here the events wrap handler execution.
   * Returns an unsubscribe function.
   */
  onCall<K extends keyof CallEventMap>(
    event: K,
    handler: (data: CallEventMap[K]) => void
  ): () => void {
    const set = this.callListeners[event] as Set<(data: CallEventMap[K]) => void>;
    set.add(handler);
    return () => {
      set.delete(handler);
    };
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
   */
  async handleMessage(message: BridgeMessage): Promise<BridgeResponse> {
    const startedAt = Date.now();
    for (const listener of this.callListeners['call:start']) {
      listener({
        id: message.id,
        action: message.action,
        payload: message.payload,
        timestamp: startedAt,
      });
    }
    try {
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
      };

      const executeFn = () => Promise.resolve(handler(message.payload, requestContext));

      let data: unknown;
      if (this.config.timeout > 0) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error(`Request timeout after ${this.config.timeout}ms`)),
            this.config.timeout
          );
        });
        data = await Promise.race([executeFn(), timeoutPromise]);
      } else {
        data = await executeFn();
      }

      const response: BridgeResponse = {
        id: message.id,
        success: true,
        data,
        timestamp: Date.now(),
        sourceId: 'host',
        targetId: message.sourceId,
      };
      for (const listener of this.callListeners['call:end']) {
        listener({
          id: message.id,
          action: message.action,
          response,
          duration: Date.now() - startedAt,
        });
      }
      return response;
    } catch (error) {
      const bridgeError: BridgeError = {
        code:
          error instanceof BridgeCallError
            ? error.code
            : toBridgeErrorCode(
                error instanceof Error && 'code' in error ? error.code : 'HANDLER_ERROR'
              ),
        message: error instanceof Error ? error.message : String(error),
        details:
          error instanceof BridgeCallError
            ? (error.details as Record<string, unknown> | undefined)
            : error instanceof Error
              ? { stack: error.stack }
              : undefined,
      };

      this.config.onError(error instanceof Error ? error : new Error(String(error)), {
        message,
      });

      for (const listener of this.callListeners['call:error']) {
        listener({
          id: message.id,
          action: message.action,
          error: error instanceof Error ? error : new Error(String(error)),
          duration: Date.now() - startedAt,
        });
      }

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
   * Detach adapter (runtime cleanup). Handlers are preserved
   * so the instance can be reattached.
   */
  destroy(): void {
    this.adapter = undefined;
  }
}

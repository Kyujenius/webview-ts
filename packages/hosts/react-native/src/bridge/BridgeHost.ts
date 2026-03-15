import type {
  BridgeMessage,
  BridgeResponse,
  BridgeError,
  BridgeEvent,
  BridgeHost as IBridgeHost,
  NativePlugin,
} from '@ts-bridge/shared';

/**
 * Configuration for the BridgeHost
 */
export interface BridgeHostConfig {
  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Maximum time to process a request (ms)
   */
  timeout?: number;

  /**
   * Custom error handler
   */
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
  /**
   * Request message ID
   */
  messageId: string;

  /**
   * Request timestamp
   */
  timestamp: number;

  /**
   * Additional metadata
   */
  metadata: Record<string, unknown>;
}

/**
 * BridgeHost - React Native side bridge implementation
 * Receives and processes messages from WebView
 */
export class BridgeHost implements IBridgeHost {
  private config: Required<BridgeHostConfig>;
  private handlers: Map<string, ActionHandler>;
  private plugins: Map<string, NativePlugin>;
  private messageCallback?: (message: string) => void;

  constructor(config: BridgeHostConfig = {}) {
    this.config = {
      debug: config.debug ?? false,
      timeout: config.timeout ?? 30000,
      onError: config.onError ?? ((error) => console.error('[BridgeHost]', error)),
    };
    this.handlers = new Map();
    this.plugins = new Map();
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<BridgeHostConfig> {
    return { ...this.config };
  }

  /**
   * Register an action handler (implements BridgeHost interface)
   */
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

  /**
   * Unregister an action handler (implements BridgeHost interface)
   */
  unregisterHandler(action: string): void {
    this.handlers.delete(action);
    this.log('debug', `Unregistered action: ${action}`);
  }

  /**
   * Register an action handler (alias for registerHandler)
   */
  registerAction<TPayload = unknown, TResponse = unknown>(
    action: string,
    handler: ActionHandler<TPayload, TResponse>
  ): void {
    this.registerHandler(action, handler as (payload: TPayload) => Promise<TResponse>);
  }

  /**
   * Unregister an action handler (alias for unregisterHandler)
   */
  unregisterAction(action: string): void {
    this.unregisterHandler(action);
  }

  /**
   * Register a native plugin
   */
  registerPlugin(plugin: NativePlugin): void {
    const { name } = plugin.metadata;

    if (this.plugins.has(name)) {
      throw new Error(`Plugin '${name}' is already registered`);
    }

    this.plugins.set(name, plugin);

    // Initialize plugin and register its actions
    plugin.initialize(this).catch((error) => {
      this.config.onError(error, { plugin: name });
    });

    this.log('debug', `Registered plugin: ${name}`);
  }

  /**
   * Unregister a native plugin
   */
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

  /**
   * Get registered plugin by name
   */
  getPlugin<T extends NativePlugin = NativePlugin>(pluginName: string): T | undefined {
    return this.plugins.get(pluginName) as T | undefined;
  }

  /**
   * Set message callback for sending messages to WebView
   * This is typically called by MessageHandler
   */
  setMessageCallback(callback: (message: string) => void): void {
    this.messageCallback = callback;
  }

  /**
   * Handle incoming message from WebView (implements BridgeHost interface)
   */
  async handleMessage(message: BridgeMessage): Promise<BridgeResponse> {
    this.log('debug', `Received message: ${message.action}`, message);

    // Create request context
    const context: RequestContext = {
      messageId: message.id,
      timestamp: message.timestamp,
      metadata: {},
    };

    // Process with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);
    });

    try {
      const handler = this.handlers.get(message.action);

      if (!handler) {
        throw new Error(`No handler registered for action: ${message.action}`);
      }

      // Execute handler with timeout
      const data = await Promise.race([
        Promise.resolve(handler(message.payload, context)),
        timeoutPromise,
      ]);

      // Return success response
      return {
        id: message.id,
        success: true,
        data,
        timestamp: Date.now(),
      };
    } catch (error) {
      // Return error response
      const bridgeError: BridgeError = {
        code: error instanceof Error && 'code' in error ? String(error.code) : 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : String(error),
        details: error instanceof Error ? { stack: error.stack } : undefined,
      };

      this.config.onError(error instanceof Error ? error : new Error(String(error)), {
        message,
        context,
      });

      return {
        id: message.id,
        success: false,
        error: bridgeError,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Handle incoming message from WebView (string version)
   */
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

  /**
   * Send event to WebView (implements BridgeHost interface)
   */
  sendEvent<TPayload = unknown>(event: string, payload: TPayload): void {
    const eventMessage: BridgeEvent<TPayload> = {
      event,
      payload,
      timestamp: Date.now(),
    };

    this.sendToWebView(eventMessage);
    this.log('debug', `Sent event: ${event}`, eventMessage);
  }

  /**
   * Send event to WebView (alias for sendEvent, allows optional payload)
   */
  emit<TPayload = unknown>(event: string, payload?: TPayload): void {
    if (payload !== undefined) {
      this.sendEvent(event, payload);
    } else {
      this.sendEvent(event, undefined as unknown as TPayload);
    }
  }

  /**
   * Send response to WebView
   */
  private sendResponse(response: BridgeResponse): void {
    this.sendToWebView(response);
    this.log('debug', `Sent response for message: ${response.id}`, response);
  }

  /**
   * Send any message to WebView
   */
  private sendToWebView(message: BridgeResponse | BridgeEvent): void {
    if (!this.messageCallback) {
      throw new Error('Message callback not set. Call setMessageCallback() first.');
    }

    const messageJson = JSON.stringify(message);
    this.messageCallback(messageJson);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Clean up all plugins
    for (const [name, plugin] of this.plugins.entries()) {
      if (plugin.destroy) {
        plugin.destroy().catch((error) => {
          this.config.onError(error, { plugin: name });
        });
      }
    }

    this.handlers.clear();
    this.plugins.clear();
    this.messageCallback = undefined;

    this.log('debug', 'BridgeHost destroyed');
  }

  /**
   * Internal logging
   */
  private log(level: 'debug' | 'error', message: string, data?: unknown): void {
    if (!this.config.debug && level === 'debug') {
      return;
    }

    const prefix = '[BridgeHost]';
    if (data !== undefined) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }
}

import { BridgeClient, BridgeHost } from '@webview-ts/core';
import type {
  BridgeMessage,
  HostAdapter,
  RequestInterceptor,
  ResponseInterceptor,
} from '@webview-ts/shared';
import { BridgeCallError } from '@webview-ts/shared';

export interface LoopbackPairOptions {
  clientInterceptors?: {
    request?: RequestInterceptor[];
    response?: ResponseInterceptor[];
  };
  hostConfig?: { timeout?: number; debug?: boolean };
  clientConfig?: { timeout?: number; debug?: boolean };
}

/**
 * A HostAdapter that connects BridgeHost directly to the window message system
 * for integration testing. No real WebView involved.
 */
class LoopbackAdapter implements HostAdapter {
  private listeners = new Set<(json: string) => void>();
  readonly sent: string[] = [];

  send(message: string): void {
    this.sent.push(message);
    // Dispatch to window so BridgeClient's message listener picks it up
    window.dispatchEvent(new MessageEvent('message', { data: message }));
  }

  onMessage(callback: (json: string) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  destroy(): void {
    this.listeners.clear();
  }
}

/**
 * Create a BridgeClient <-> BridgeHost pair connected via LoopbackAdapter.
 *
 * Message flow (call/response):
 *   BridgeClient.call()
 *     -> FallbackAdapter invokes handler
 *       -> handler calls host.handleMessage(message) -- object-level
 *         -> handler executes -> BridgeResponse
 *           -> FallbackAdapter resolves promise -> BridgeClient receives data
 *
 * Message flow (events):
 *   host.sendEvent() -> LoopbackAdapter.send() -> window message -> BridgeClient.handleEvent()
 *
 * Note: JSON serialization boundary is tested separately in serialization-boundary.test.ts
 * via BridgeHost.handleMessageString() directly.
 */
export function createLoopbackPair(options: LoopbackPairOptions = {}) {
  const host = new BridgeHost(options.hostConfig);

  const adapter = new LoopbackAdapter();
  host.attach(adapter);

  // Build fallback that routes through BridgeHost (object-level)
  const fallbackHandlers: Record<string, (payload: any) => Promise<any>> = {};

  function registerHostHandler(action: string, handler: (payload: any, ctx?: any) => Promise<any>) {
    host.registerHandler(action, handler);
    // Also register a fallback that routes through the host's full pipeline
    fallbackHandlers[action] = async (payload: any) => {
      const message: BridgeMessage = {
        id: `lb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sourceId: 'loopback',
        targetId: 'host',
        action,
        payload,
        timestamp: Date.now(),
      };
      const response = await host.handleMessage(message);
      if (!response.success) {
        throw new BridgeCallError(
          response.error.message,
          response.error.code,
          response.error.details
        );
      }
      return response.data;
    };
  }

  const bridge = new BridgeClient({
    ...options.clientConfig,
    fallback: fallbackHandlers,
  });

  // Register interceptors
  for (const int of options.clientInterceptors?.request ?? []) bridge.interceptors.request.use(int);
  for (const int of options.clientInterceptors?.response ?? [])
    bridge.interceptors.response.use(int);

  bridge.connect();

  return {
    bridge,
    host,
    registerHostHandler,
    /** Send an event from host -> client */
    sendEvent: (event: string, payload: unknown) => host.sendEvent(event, payload),
    /** Get all raw JSON messages sent from host */
    getClientInbox: () => [...adapter.sent],
    destroy: () => {
      bridge.destroy();
      host.destroy();
    },
  };
}

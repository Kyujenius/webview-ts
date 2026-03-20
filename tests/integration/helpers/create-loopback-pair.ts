import { BridgeHost, BridgeClient } from '@webview-ts/core';
import type { BridgeMessage, Middleware, HostAdapter } from '@webview-ts/shared';

export interface LoopbackPairOptions {
  clientMiddleware?: Middleware[];
  hostMiddleware?: Middleware[];
  hostConfig?: { timeout?: number; debug?: boolean };
  clientConfig?: { timeout?: number; debug?: boolean; maxConcurrentRequests?: number };
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
 *         -> host middleware pipeline -> handler executes -> BridgeResponse
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
        action,
        payload,
        timestamp: Date.now(),
      };
      const response = await host.handleMessage(message);
      if (!response.success) {
        throw new Error(response.error.message);
      }
      return response.data;
    };
  }

  const bridge = new BridgeClient({
    ...options.clientConfig,
    fallback: fallbackHandlers,
  });

  // Apply middleware
  for (const mw of options.clientMiddleware ?? []) bridge.use(mw);
  for (const mw of options.hostMiddleware ?? []) host.use(mw);

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

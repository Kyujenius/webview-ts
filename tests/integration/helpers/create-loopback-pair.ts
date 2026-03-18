import { BridgeHost } from '@webview-ts/react-native';
import { BridgeManager } from '@webview-ts/core';
import type { BridgeMessage, Middleware } from '@webview-ts/shared';

export interface LoopbackPairOptions {
  clientMiddleware?: Middleware[];
  hostMiddleware?: Middleware[];
  hostConfig?: { timeout?: number; debug?: boolean };
  clientConfig?: { timeout?: number; debug?: boolean; maxConcurrentRequests?: number };
}

/**
 * Create a BridgeManager <-> BridgeHost pair connected via FallbackAdapter loopback.
 *
 * Message flow (call/response):
 *   BridgeManager.call()
 *     -> FallbackAdapter invokes handler
 *       -> handler calls host.handleMessage(message) -- object-level
 *         -> host middleware pipeline -> handler executes -> BridgeResponse
 *           -> FallbackAdapter resolves promise -> BridgeManager receives data
 *
 * Message flow (events):
 *   host.sendEvent() -> messageCallback -> BridgeManager.handleEvent()
 *
 * Note: JSON serialization boundary is tested separately in serialization-boundary.test.ts
 * via BridgeHost.handleMessageString() directly.
 */
export function createLoopbackPair(options: LoopbackPairOptions = {}) {
  const host = new BridgeHost(options.hostConfig);

  // Capture messages sent from host -> client
  const clientInbox: string[] = [];

  host.setMessageCallback((json: string) => {
    clientInbox.push(json);
    // Dispatch to window so BridgeManager's message listener picks it up
    // (requires happy-dom environment for window/MessageEvent to exist)
    window.dispatchEvent(new MessageEvent('message', { data: json }));
  });

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

  const bridge = new BridgeManager({
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
    getClientInbox: () => [...clientInbox],
    destroy: () => {
      bridge.destroy();
      host.destroy();
    },
  };
}

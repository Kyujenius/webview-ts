import type { BridgeHostConfig, ActionHandler } from '../bridge/BridgeHost';
import { BridgeHost } from '../bridge/BridgeHost';
import { MessageHandler } from '../bridge/MessageHandler';

// ---- Pure function (non-React) ----

export interface SimpleBridgeHostOptions {
  /** Action handlers — key is action name, value is the handler function */
  handlers: Record<string, ActionHandler<any, any>>;
  /** Optional BridgeHost configuration */
  config?: BridgeHostConfig;
  /** Optional debug mode */
  debug?: boolean;
}

export interface SimpleBridgeHostResult {
  bridgeHost: BridgeHost;
  messageHandler: MessageHandler;
  /** Spread these onto your WebView component */
  webViewProps: {
    onMessage: (event: any) => void;
    ref: (ref: any) => void;
  };
  /** Send an event to the web side */
  sendEvent: <T>(event: string, payload: T) => void;
}

/**
 * Creates a simplified bridge host setup. Pure function — usable outside React.
 */
export function createSimpleBridgeHost(
  options: SimpleBridgeHostOptions,
): SimpleBridgeHostResult {
  const { handlers, config, debug } = options;

  const bridgeHost = new BridgeHost({ ...config, debug });
  const messageHandler = new MessageHandler(bridgeHost, { debug });

  for (const [action, handler] of Object.entries(handlers)) {
    bridgeHost.registerHandler(action, handler as any);
  }

  const webViewProps = {
    onMessage: messageHandler.handleWebViewMessage,
    ref: (ref: any) => messageHandler.setWebViewRef(ref),
  };

  const sendEvent = <T>(event: string, payload: T) => {
    bridgeHost.sendEvent(event, payload);
  };

  return { bridgeHost, messageHandler, webViewProps, sendEvent };
}

// ---- React hook ----

import { useMemo, useCallback, useEffect } from 'react';

export interface UseBridgeHostReturn {
  /** Spread onto your WebView: `<WebView {...webViewProps} source={...} />` */
  webViewProps: {
    onMessage: (event: any) => void;
    ref: (ref: any) => void;
  };
  /** Send an event to the web side */
  sendEvent: <T>(event: string, payload: T) => void;
  /** Direct access to BridgeHost (advanced usage) */
  bridgeHost: BridgeHost;
}

/**
 * React Native hook for simplified bridge host setup.
 * Handlers are captured on mount and do not change after.
 *
 * @example
 * ```tsx
 * const { webViewProps, sendEvent } = useBridgeHost({
 *   handlers: {
 *     'camera.take': async (payload) => takePhoto(payload),
 *     'storage.get': async (payload) => AsyncStorage.getItem(payload.key),
 *   },
 * });
 *
 * return <WebView {...webViewProps} source={{ uri: webUrl }} />;
 * ```
 */
export function useBridgeHost(options: SimpleBridgeHostOptions): UseBridgeHostReturn {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers are captured once on mount
  const result = useMemo(() => createSimpleBridgeHost(options), []);

  useEffect(() => {
    return () => {
      result.bridgeHost.destroy();
    };
  }, [result]);

  const sendEvent = useCallback(
    <T>(event: string, payload: T) => result.sendEvent(event, payload),
    [result],
  );

  return {
    webViewProps: result.webViewProps,
    sendEvent,
    bridgeHost: result.bridgeHost,
  };
}

import type { ActionMapBase, Middleware } from '@webview-ts/shared';
import type { HostPluginResult } from '@webview-ts/shared';
import type { BridgeHostConfig, ActionHandler } from '../bridge/BridgeHost';
import { BridgeHost } from '../bridge/BridgeHost';
import { MessageHandler } from '../bridge/MessageHandler';

// ---- Typed handler map ----

/**
 * Maps each action in the ActionMap to a handler with the correct payload/response types.
 * Ensures all actions are implemented with the right signatures.
 */
export type TypedHandlers<TActions extends ActionMapBase> = {
  [K in keyof TActions & string]: ActionHandler<TActions[K]['payload'], TActions[K]['response']>;
};

// ---- Pure function (non-React) ----

export interface SimpleBridgeHostOptions<TActions extends ActionMapBase = ActionMapBase> {
  /** Action handlers — fully typed when TActions is provided */
  handlers?: TypedHandlers<TActions>;
  /** Plugins that provide additional handlers */
  plugins?: HostPluginResult[];
  /** Middleware — same MiddlewareFn type as web side */
  middleware?: Middleware[];
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
 *
 * @example
 * ```typescript
 * type MyActions = {
 *   'camera.take': { payload: { quality: number }; response: { uri: string } };
 * };
 *
 * const { webViewProps } = createSimpleBridgeHost<MyActions>({
 *   handlers: {
 *     'camera.take': async (payload) => {
 *       //            ^? { quality: number }
 *       return { uri: '/photo.jpg' }; // ✅ typed return
 *     },
 *   },
 * });
 * ```
 */
export function createSimpleBridgeHost<TActions extends ActionMapBase = ActionMapBase>(
  options: SimpleBridgeHostOptions<TActions>
): SimpleBridgeHostResult {
  const { handlers, plugins, middleware, config, debug } = options;

  const bridgeHost = new BridgeHost({ ...config, debug });

  // Register middleware
  if (middleware) {
    for (const mw of middleware) {
      bridgeHost.use(mw);
    }
  }

  const messageHandler = new MessageHandler(bridgeHost, { debug });

  const registeredActions = new Set<string>();

  // Register direct handlers
  if (handlers) {
    for (const [action, handler] of Object.entries(handlers)) {
      bridgeHost.registerHandler(action, handler);
      registeredActions.add(action);
    }
  }

  // Register plugin handlers — inject ctx.emit for plugins with events
  if (plugins) {
    for (const plugin of plugins) {
      const hasEvents = plugin.eventNames.length > 0;
      for (const [action, handler] of Object.entries(plugin.handlers)) {
        if (registeredActions.has(action)) {
          throw new Error(`Duplicate action name '${action}' from plugin '${plugin.pluginName}'`);
        }
        if (hasEvents) {
          const prefix = plugin.pluginName;
          bridgeHost.registerHandler(action, (payload: any, context: any) => {
            const emit = (eventShortName: string, eventPayload: unknown) => {
              bridgeHost.sendEvent(`${prefix}.${eventShortName}`, eventPayload);
            };
            return handler(payload, { ...context, emit });
          });
        } else {
          bridgeHost.registerHandler(action, handler);
        }
        registeredActions.add(action);
      }
    }
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
 * type MyActions = {
 *   'camera.take': { payload: { quality: number }; response: { uri: string } };
 *   'storage.get': { payload: { key: string }; response: { value: string | null } };
 * };
 *
 * const { webViewProps, sendEvent } = useBridgeHost<MyActions>({
 *   handlers: {
 *     'camera.take': async (payload) => takePhoto(payload),
 *     //                    ^? { quality: number }
 *     'storage.get': async (payload) => ({ value: await AsyncStorage.getItem(payload.key) }),
 *     //                    ^? { key: string }
 *   },
 * });
 *
 * return <WebView {...webViewProps} source={{ uri: webUrl }} />;
 * ```
 */
export function useBridgeHost<TActions extends ActionMapBase = ActionMapBase>(
  options: SimpleBridgeHostOptions<TActions>
): UseBridgeHostReturn {
  const result = useMemo(() => createSimpleBridgeHost(options), []);

  useEffect(() => {
    return () => {
      result.bridgeHost.destroy();
    };
  }, [result]);

  const sendEvent = useCallback(
    <T>(event: string, payload: T) => result.sendEvent(event, payload),
    [result]
  );

  return {
    webViewProps: result.webViewProps,
    sendEvent,
    bridgeHost: result.bridgeHost,
  };
}

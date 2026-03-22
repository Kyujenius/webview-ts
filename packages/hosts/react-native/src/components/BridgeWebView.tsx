import { useMemo, useCallback, useEffect } from 'react';
import type { ActionMapBase, Middleware } from '@webview-ts/shared';
import type { HostPluginResult } from '@webview-ts/shared';
import { ConnectionRegistry, generateSourceId } from '@webview-ts/shared';
import type { BridgeHostConfig } from '@webview-ts/core';
import { createSimpleBridgeHost, type TypedHandlers } from '../hooks/useBridgeHost';

export interface BridgeWebViewProps<TActions extends ActionMapBase = ActionMapBase> {
  /** WebView source */
  source: { uri: string } | { html: string };
  /** Action handlers */
  handlers?: TypedHandlers<TActions>;
  /** Plugins that provide additional handlers */
  plugins?: HostPluginResult[];
  /** Middleware */
  middleware?: Middleware[];
  /** BridgeHost configuration */
  config?: BridgeHostConfig;
  /** Shared ConnectionRegistry for multi-webview routing */
  registry?: ConnectionRegistry;
  /** Name for this WebView instance (used in sourceId and DevTools) */
  name?: string;
}

export function useBridgeWebView<TActions extends ActionMapBase = ActionMapBase>(
  props: BridgeWebViewProps<TActions>
) {
  const { handlers, plugins, middleware, config, registry, name } = props;

  const sourceId = useMemo(() => generateSourceId(name), [name]);

  const host = useMemo(
    () => createSimpleBridgeHost({ handlers, plugins, middleware, config }),
    [] // intentionally empty — host is created once on mount, matching useBridgeHost behavior
  );

  // Register with ConnectionRegistry if provided
  useEffect(() => {
    if (!registry) return;
    const sender = (message: string) => {
      host.adapter.send(message);
    };
    registry.register(sourceId, sender);
    return () => registry.unregister(sourceId);
  }, [registry, sourceId, host]);

  useEffect(() => {
    return () => host.bridgeHost.destroy();
  }, [host]);

  const sendEvent = useCallback(
    <T,>(event: string, payload: T) => host.sendEvent(event, payload),
    [host]
  );

  // TODO: Render actual WebView once react-native-webview is available as a peer dep.
  // For now, this hook returns props to spread onto a user-provided WebView.
  return {
    sourceId,
    webViewProps: host.webViewProps,
    sendEvent,
    bridgeHost: host.bridgeHost,
  };
}

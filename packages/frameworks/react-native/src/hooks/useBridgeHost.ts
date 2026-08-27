import type { BridgeHost, BridgeHostConfig } from '@webview-ts/core';
import type { DefinedHandlers } from '@webview-ts/core';
import { createBridgeHost as createCoreBridgeHost } from '@webview-ts/core';
import type { ActionMapBase, ConnectionRegistry } from '@webview-ts/shared';
import type { HostPluginResult, HostSendEvent, MergeHostPluginEvents } from '@webview-ts/shared';
import { generateSourceId } from '@webview-ts/shared';

import { ReactNativeHostAdapter } from '../adapters/ReactNativeHostAdapter';

// The typed-handler surface lives in core (platform-neutral) — re-exported
// here so RN apps keep single-package imports.
export type { DefinedHandlers, TypedHandlers } from '@webview-ts/core';
export { defineHandlers } from '@webview-ts/core';

// ---- RN-flavored options/result (wraps the neutral core factory) ----

export interface CreateBridgeHostOptions<
  TActions extends ActionMapBase = ActionMapBase,
  TPlugins extends readonly HostPluginResult<any>[] = readonly HostPluginResult<any>[],
> {
  /** Action handlers — fully typed when TActions is provided (explicit generic
   *  or a defineHandlers-wrapped value; the latter keeps plugin inference) */
  handlers?: DefinedHandlers<TActions>;
  /** Plugins that provide additional handlers */
  plugins?: TPlugins;
  /** Optional BridgeHost configuration */
  config?: BridgeHostConfig;
  /** Shared ConnectionRegistry for multi-webview routing */
  registry?: ConnectionRegistry;
  /** Name for this WebView instance (used in sourceId and DevTools) */
  name?: string;
  /** Platform transport override — defaults to a fresh ReactNativeHostAdapter */
  adapter?: ReactNativeHostAdapter;
}

export interface CreateBridgeHostResult<TEvents = unknown> {
  bridgeHost: BridgeHost;
  adapter: ReactNativeHostAdapter;
  /** Spread these onto your WebView component */
  webViewProps: {
    onMessage: (event: any) => void;
    ref: (ref: any) => void;
  };
  /** Send an event to the web side */
  sendEvent: HostSendEvent<TEvents>;
}

/**
 * React Native flavor of the neutral core factory: injects a
 * ReactNativeHostAdapter by default and derives the WebView props.
 * Pure function — usable outside React.
 *
 * @example
 * ```typescript
 * type MyActions = {
 *   'camera.take': { payload: { quality: number }; response: { uri: string } };
 * };
 *
 * const { webViewProps } = createBridgeHost<MyActions>({
 *   handlers: {
 *     'camera.take': async (payload) => {
 *       //            ^? { quality: number }
 *       return { uri: '/photo.jpg' }; // ✅ typed return
 *     },
 *   },
 * });
 * ```
 */
export function createBridgeHost<
  TActions extends ActionMapBase = ActionMapBase,
  const TPlugins extends readonly HostPluginResult<any>[] = readonly HostPluginResult<any>[],
>(
  options: CreateBridgeHostOptions<TActions, TPlugins>
): CreateBridgeHostResult<MergeHostPluginEvents<TPlugins>> {
  const adapter = options.adapter ?? new ReactNativeHostAdapter();

  const { bridgeHost, sendEvent } = createCoreBridgeHost<TActions, TPlugins>({
    adapter,
    handlers: options.handlers,
    plugins: options.plugins,
    config: options.config,
  });

  const webViewProps = {
    onMessage: adapter.handleNativeEvent,
    ref: (ref: any) => adapter.setWebViewRef(ref),
  };

  return { bridgeHost, adapter, webViewProps, sendEvent };
}

// ---- React hook ----

import { useEffect, useMemo } from 'react';

export interface UseBridgeHostReturn<TEvents = unknown> {
  /** Spread onto your WebView: `<WebView {...webViewProps} source={...} />` */
  webViewProps: {
    onMessage: (event: any) => void;
    ref: (ref: any) => void;
  };
  /** Send an event to the web side */
  sendEvent: HostSendEvent<TEvents>;
  /** Direct access to BridgeHost (advanced usage) */
  bridgeHost: BridgeHost;
  /** Unique source ID for this WebView instance */
  sourceId: string;
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
export function useBridgeHost<
  TActions extends ActionMapBase = ActionMapBase,
  const TPlugins extends readonly HostPluginResult<any>[] = readonly HostPluginResult<any>[],
>(
  options: CreateBridgeHostOptions<TActions, TPlugins>
): UseBridgeHostReturn<MergeHostPluginEvents<TPlugins>> {
  const { registry, name } = options;
  const sourceId = useMemo(() => generateSourceId(name), [name]);
  const result = useMemo(() => createBridgeHost(options), []);

  // Register with ConnectionRegistry if provided (multi-webview routing)
  useEffect(() => {
    if (!registry) return;
    const sender = (message: string) => {
      result.adapter.send(message);
    };
    registry.register(sourceId, sender);
    return () => registry.unregister(sourceId);
  }, [registry, sourceId, result]);

  // Symmetric attach/destroy: Strict Mode's setup→cleanup→setup cycle
  // re-attaches the memoized host instead of leaving it permanently dead
  // (attach detaches any previous subscription, so no stacking either).
  useEffect(() => {
    result.bridgeHost.attach(result.adapter);
    return () => {
      result.bridgeHost.destroy();
    };
  }, [result]);

  return {
    webViewProps: result.webViewProps,
    // result is memoized, so sendEvent is already referentially stable
    sendEvent: result.sendEvent,
    bridgeHost: result.bridgeHost,
    sourceId,
  };
}

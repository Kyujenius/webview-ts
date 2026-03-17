import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { createBridge } from '@webview-ts/core';
import type { BridgeManager } from '@webview-ts/core';
import type {
  BridgeConfig,
  BridgeCallOptions,
  ConnectionMode,
  ActionDefinitionShape,
  ActionNames,
} from '@webview-ts/shared';
import type { PluginInstance, PluginCall, MergePluginActions } from '@webview-ts/shared';
import { useBridgeCore } from './internal/useBridgeCore';
import { useActionCore } from './internal/useActionCore';
import { useEventCore } from './internal/useEventCore';

interface BridgeContextValue<TActions extends Record<string, ActionDefinitionShape>> {
  bridge: BridgeManager<TActions>;
  isAvailable: boolean;
  connectionMode: ConnectionMode;
}

export interface TypedBridgeProviderProps {
  config?: BridgeConfig;
  children: React.ReactNode;
}

export interface CreateBridgeReactOptions<TPlugins extends PluginInstance<any, any>[]> {
  plugins?: TPlugins;
  config?: BridgeConfig;
}

/**
 * Creates a fully type-safe set of React components and hooks
 * bound to a specific ActionMap. Similar to tRPC's `createTRPCReact`.
 *
 * @example
 * ```typescript
 * // 1. Define your action contract
 * type MyActions = {
 *   'camera.take': { payload: { quality: number }; response: { uri: string } };
 *   'storage.get': { payload: { key: string }; response: { value: string | null } };
 * };
 *
 * // 2. Create typed hooks (once)
 * const { BridgeProvider, useBridge, useAction, useEvent } = createBridgeReact<MyActions>();
 *
 * // 3. Use — full autocompletion & type checking
 * const { call } = useBridge();
 * const result = await call('camera.take', { quality: 0.8 });
 * //    ^? { uri: string }
 * ```
 */
export function createBridgeReact<
  TCustomActions extends Record<string, ActionDefinitionShape> = Record<string, never>,
  const TPlugins extends PluginInstance<any, any>[] = [],
>(options?: CreateBridgeReactOptions<TPlugins>) {
  type TAllActions = MergePluginActions<TPlugins> & TCustomActions;

  const Context = createContext<BridgeContextValue<TAllActions> | null>(null);

  function useTypedContext(): BridgeContextValue<TAllActions> {
    const ctx = useContext(Context);
    if (!ctx)
      throw new Error('useBridge/useAction/useEvent must be used within a <BridgeProvider>');
    return ctx;
  }

  // ---- BridgeProvider ----

  function BridgeProvider({ config: propConfig, children }: TypedBridgeProviderProps) {
    const mergedConfig = propConfig ?? options?.config;
    const bridge = useMemo(() => {
      const b = createBridge<TAllActions>(mergedConfig);
      // Register per-action interceptors from plugin definitions
      if (options?.plugins) {
        for (const plugin of options.plugins) {
          if (plugin.interceptors && Object.keys(plugin.interceptors).length > 0) {
            b.registerInterceptors(plugin.interceptors);
          }
          if (plugin.timeouts && Object.keys(plugin.timeouts).length > 0) {
            b.registerTimeouts(plugin.timeouts);
          }
        }
      }
      return b;
    }, []);
    const [isAvailable, setIsAvailable] = useState(() => bridge.isAvailable());
    const [connectionMode, setConnectionMode] = useState(() => bridge.connectionMode);
    useEffect(() => {
      setIsAvailable(bridge.isAvailable());
      setConnectionMode(bridge.connectionMode);
      return () => {
        bridge.destroy();
      };
    }, [bridge]);
    const value = useMemo(
      () => ({ bridge, isAvailable, connectionMode }),
      [bridge, isAvailable, connectionMode]
    );
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  // ---- useBridge ----

  function useBridge() {
    const { bridge, isAvailable, connectionMode } = useTypedContext();
    const { call, on, off } = useBridgeCore(bridge);
    return { call, on, off, isAvailable, connectionMode, bridge };
  }

  // ---- useAction ----

  function useAction<TAction extends ActionNames<TAllActions>>(
    action: TAction,
    defaultOptions?: BridgeCallOptions
  ) {
    const { bridge } = useTypedContext();
    return useActionCore(bridge, action, defaultOptions);
  }

  // ---- useEvent ----

  function useEvent<TPayload = unknown>(event: string, handler: (payload: TPayload) => void): void {
    const { bridge } = useTypedContext();
    useEventCore(bridge, event, handler);
  }

  // ---- usePlugin ----

  function usePlugin<TPlugin extends TPlugins[number]>(
    plugin: TPlugin
  ): ReturnType<TPlugin['methods']> {
    const { bridge } = useTypedContext();
    const call: PluginCall<TPlugin['_types']> = useCallback(
      (action: any, payload: any) => bridge.call(action, payload) as any,
      [bridge]
    );
    return useMemo(() => plugin.methods(call), [call, plugin]) as ReturnType<TPlugin['methods']>;
  }

  return { BridgeProvider, useBridge, useAction, useEvent, usePlugin };
}

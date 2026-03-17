import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { BridgeManager } from '@webview-ts/core';
import type {
  BridgeConfig,
  BridgeCallOptions,
  ConnectionMode,
  ActionDefinitionShape,
  ActionNames,
  FallbackMap,
} from '@webview-ts/shared';
import type {
  PluginInstance,
  PluginCall,
  MergePluginActions,
  AutoMethods,
  TypedEventSubscriber,
} from '@webview-ts/shared';
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

export interface CreateBridgeReactOptions<TPlugins extends PluginInstance<any, any, any>[]> {
  plugins?: TPlugins;
  config?: BridgeConfig;
}

export function createBridgeReact<
  TCustomActions extends Record<string, ActionDefinitionShape> = Record<string, never>,
  const TPlugins extends PluginInstance<any, any, any>[] = [],
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

    // useMemo: create instance without side effects (safe for Strict Mode double-invoke)
    const bridge = useMemo(() => {
      // Auto-collect fallbacks from plugins
      let pluginFallback: FallbackMap = {};
      if (options?.plugins) {
        for (const plugin of options.plugins) {
          if (plugin.fallback) {
            pluginFallback = { ...pluginFallback, ...plugin.fallback };
          }
        }
      }

      // Merge: plugin fallback (base) + config fallback (override)
      const configFallback = mergedConfig?.fallback;
      let finalFallback: BridgeConfig['fallback'];
      if (Object.keys(pluginFallback).length > 0) {
        const configHandlers =
          configFallback && typeof configFallback === 'object' && !('mode' in configFallback)
            ? (configFallback as FallbackMap)
            : configFallback && typeof configFallback === 'object' && 'handlers' in configFallback
              ? ((configFallback as { handlers?: FallbackMap }).handlers ?? {})
              : {};
        finalFallback = { ...pluginFallback, ...configHandlers };
      } else {
        finalFallback = configFallback;
      }

      const finalConfig: BridgeConfig = { ...mergedConfig, fallback: finalFallback };
      const b = new BridgeManager<TAllActions>(finalConfig);

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

    // useEffect: side effects (message listener, devtools) — runs once in Strict Mode
    useEffect(() => {
      bridge.connect();
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
  ): AutoMethods<TPlugin extends PluginInstance<any, infer M, any> ? M : never> & {
    on: TypedEventSubscriber<TPlugin extends PluginInstance<any, any, infer E> ? E : never>;
  } {
    const { bridge } = useTypedContext();
    const call: PluginCall<TPlugin['_types']> = useCallback(
      (action: any, payload: any) => bridge.call(action, payload) as any,
      [bridge]
    );
    const methods = useMemo(() => plugin.methods(call), [call, plugin]);

    const on = useCallback(
      (eventShortName: string, handler: (payload: any) => void) => {
        const fullName = `${plugin.name}.${eventShortName}`;
        return bridge.on(fullName, handler);
      },
      [bridge, plugin]
    );

    return useMemo(() => ({ ...methods, on }), [methods, on]) as any;
  }

  return { BridgeProvider, useBridge, useAction, useEvent, usePlugin };
}

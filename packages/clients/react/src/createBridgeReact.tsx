import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { BridgeManager, ActionStateManager } from '@webview-ts/core';
import type { ActionState } from '@webview-ts/core';
import { useSyncExternalStore } from 'use-sync-external-store/shim';
import type {
  BridgeConfig,
  BridgeCallOptions,
  ConnectionMode,
  ActionDefinitionShape,
  ActionNames,
  FallbackMap,
  EventNames,
} from '@webview-ts/shared';
import type {
  PluginInstance,
  MergePluginActions,
  MergePluginEvents,
  TypedEventSubscriber,
} from '@webview-ts/shared';
import { useBridgeCore } from './internal/useBridgeCore';
import { useActionCore } from './internal/useActionCore';
import { useEventCore } from './internal/useEventCore';

interface BridgeContextValue<
  TActions extends Record<string, ActionDefinitionShape>,
  TEvents extends Record<string, unknown>,
> {
  bridge: BridgeManager<TActions, TEvents>;
  isAvailable: boolean;
  connectionMode: ConnectionMode;
}

export interface TypedBridgeProviderProps {
  config?: BridgeConfig;
  children: React.ReactNode;
}

export interface CreateBridgeReactOptions<
  TPlugins extends PluginInstance<any, any, any>[],
  TCustomEvents extends Record<string, unknown> = Record<string, never>,
> {
  plugins?: TPlugins;
  config?: BridgeConfig;
  /** Zero-cost event type marker for custom events. Use `{} as MyEvents`. */
  events?: TCustomEvents;
}

export function createBridgeReact<
  TCustomActions extends Record<string, ActionDefinitionShape> = Record<string, never>,
  const TPlugins extends PluginInstance<any, any, any>[] = [],
  TCustomEvents extends Record<string, unknown> = Record<string, never>,
>(options?: CreateBridgeReactOptions<TPlugins, TCustomEvents>) {
  type TAllActions = MergePluginActions<TPlugins> & TCustomActions;
  type TAllEvents = MergePluginEvents<TPlugins> & TCustomEvents;

  const Context = createContext<BridgeContextValue<TAllActions, TAllEvents> | null>(null);

  function useTypedContext(): BridgeContextValue<TAllActions, TAllEvents> {
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
      const b = new BridgeManager<TAllActions, TAllEvents>(finalConfig);

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

  function useEvent<K extends EventNames<TAllEvents>>(
    event: K,
    handler: (payload: TAllEvents[K]) => void
  ): void {
    const { bridge } = useTypedContext();
    useEventCore(bridge, event, handler);
  }

  // ---- usePlugin ----

  function usePlugin<TPlugin extends TPlugins[number]>(plugin: TPlugin) {
    const { bridge } = useTypedContext();

    // Create one ActionStateManager per action
    const managers = useMemo(() => {
      const result: Record<string, ActionStateManager<any, any>> = {};
      for (const [shortName, fullName] of Object.entries(plugin.actions)) {
        result[shortName] = bridge.createActionState(fullName as ActionNames<TAllActions>);
      }
      return result;
    }, [bridge, plugin]);

    // Combined store: aggregate all managers into one useSyncExternalStore call
    // (hooks cannot be called in a loop per React rules)
    const store = useMemo(() => {
      let cache: Record<string, ActionState<any>> | null = null;
      return {
        subscribe(listener: () => void) {
          const unsubs = Object.values(managers).map((m) =>
            m.subscribe(() => {
              cache = null;
              listener();
            })
          );
          return () => unsubs.forEach((fn) => fn());
        },
        getSnapshot() {
          if (!cache) {
            cache = Object.fromEntries(
              Object.entries(managers).map(([k, m]) => [k, m.getSnapshot()])
            );
          }
          return cache;
        },
      };
    }, [managers]);

    const snapshots = useSyncExternalStore(store.subscribe, store.getSnapshot);

    const on: TypedEventSubscriber<TPlugin['_eventTypes']> = useCallback(
      ((eventShortName: string, handler: (payload: any) => void) => {
        const fullName = `${plugin.name}.${eventShortName}`;
        return bridge.on(fullName as any, handler as any);
      }) as any,
      [bridge, plugin]
    );

    return useMemo(() => {
      const result: Record<string, any> = { on };
      for (const [shortName, manager] of Object.entries(managers)) {
        result[shortName] = {
          ...snapshots[shortName],
          execute: manager.execute,
          reset: manager.reset,
        };
      }
      return result;
    }, [snapshots, managers, on]) as any;
  }

  return { BridgeProvider, useBridge, useAction, useEvent, usePlugin };
}

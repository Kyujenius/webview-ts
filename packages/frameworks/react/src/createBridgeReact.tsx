import { BridgeClient } from '@webview-ts/core';
import type { ActionState, ActionStateManager } from '@webview-ts/shared';
import type {
  ActionMapBase,
  ActionNames,
  BridgeConfig,
  ConnectionMode,
  EventMapBase,
  EventNames,
  RequestInterceptor,
  ResponseInterceptor,
  UseActionOptions,
} from '@webview-ts/shared';
import type {
  AnyPluginList,
  EmptyEventMap,
  MergePluginActions,
  MergePluginEvents,
  TypedEventSubscriber,
  UsePluginResult,
} from '@webview-ts/shared';
import { mergeFallbacks } from '@webview-ts/shared';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';

import { useActionCore } from './internal/useActionCore';
import { useBridgeCore } from './internal/useBridgeCore';
import { useEventCore } from './internal/useEventCore';

interface BridgeContextValue<TActions extends ActionMapBase, TEvents extends EventMapBase> {
  bridge: BridgeClient<TActions, TEvents>;
  isAvailable: boolean;
  connectionMode: ConnectionMode;
}

export interface TypedBridgeProviderProps {
  config?: BridgeConfig;
  children: React.ReactNode;
}

export interface CreateBridgeReactOptions<
  TPlugins extends AnyPluginList,
  TCustomEvents extends EventMapBase = EmptyEventMap,
> {
  plugins?: TPlugins;
  config?: BridgeConfig;
  /** Global interceptors applied to all requests/responses. */
  interceptors?: {
    request?: RequestInterceptor[];
    response?: ResponseInterceptor[];
  };
  /** Zero-cost event type marker for custom events. Use `{} as MyEvents`. */
  events?: TCustomEvents;
}

export function createBridgeReact<
  TCustomActions extends ActionMapBase = EmptyEventMap,
  const TPlugins extends AnyPluginList = [],
  TCustomEvents extends EventMapBase = EmptyEventMap,
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
      const finalFallback = mergeFallbacks(options?.plugins, mergedConfig?.fallback);
      const finalConfig: BridgeConfig = { ...mergedConfig, fallback: finalFallback };
      const b = new BridgeClient<TAllActions, TAllEvents>(finalConfig);

      b.applyPlugins(options?.plugins, options?.interceptors);

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
    defaultOptions?: UseActionOptions
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

  function usePlugin<TPlugin extends TPlugins[number]>(plugin: TPlugin): UsePluginResult<TPlugin> {
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
    }, [snapshots, managers, on]) as UsePluginResult<TPlugin>;
  }

  return { BridgeProvider, useBridge, useAction, useEvent, usePlugin };
}

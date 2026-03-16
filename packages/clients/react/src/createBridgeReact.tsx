import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { createBridge } from '@webview-ts/core';
import type { BridgeManager } from '@webview-ts/core';
import type {
  BridgeConfig,
  BridgeCallOptions,
  ConnectionMode,
  ActionDefinitionShape,
  ActionNames,
  InferPayload,
  InferResponse,
} from '@webview-ts/shared';
import type { PluginInstance, PluginCall, MergePluginActions } from '@webview-ts/shared';

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
    const call = useCallback(
      <TAction extends ActionNames<TAllActions>>(
        action: TAction,
        payload: InferPayload<TAllActions, TAction>,
        options?: BridgeCallOptions
      ) => bridge.call(action, payload, options),
      [bridge]
    );
    const on = useCallback(
      <TPayload = unknown,>(event: string, handler: (payload: TPayload) => void) =>
        bridge.on(event, handler),
      [bridge]
    );
    const off = useCallback(
      (event: string, handler?: (payload: unknown) => void) => bridge.off(event, handler),
      [bridge]
    );
    return { call, on, off, isAvailable, connectionMode, bridge };
  }

  // ---- useAction ----

  function useAction<TAction extends ActionNames<TAllActions>>(
    action: TAction,
    defaultOptions?: BridgeCallOptions
  ) {
    type TResponse = InferResponse<TAllActions, TAction>;
    const { bridge } = useTypedContext();
    const [data, setData] = useState<TResponse | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const execute = useCallback(
      async (
        payload: InferPayload<TAllActions, TAction>,
        options?: BridgeCallOptions
      ): Promise<TResponse> => {
        setIsLoading(true);
        setError(null);
        try {
          const result = await bridge.call(action, payload, options ?? defaultOptions);
          setData(result);
          return result;
        } catch (err) {
          const e = err instanceof Error ? err : new Error(String(err));
          setError(e);
          throw e;
        } finally {
          setIsLoading(false);
        }
      },
      [bridge, action, defaultOptions]
    );

    const reset = useCallback(() => {
      setData(null);
      setError(null);
      setIsLoading(false);
    }, []);
    return { execute, data, error, isLoading, reset };
  }

  // ---- useEvent ----

  function useEvent<TPayload = unknown>(event: string, handler: (payload: TPayload) => void): void {
    const { bridge } = useTypedContext();
    const handlerRef = useRef(handler);
    handlerRef.current = handler;
    useEffect(() => {
      const unsubscribe = bridge.on(event, (payload: unknown) => {
        handlerRef.current(payload as TPayload);
      });
      return unsubscribe;
    }, [bridge, event]);
  }

  // ---- usePlugin ----

  function usePlugin<TPlugin extends TPlugins[number]>(
    plugin: TPlugin
  ): ReturnType<TPlugin['methods']> {
    const { bridge } = useTypedContext();
    const call: PluginCall<TPlugin['_actionMap']> = useCallback(
      (action: any, payload: any) => bridge.call(action, payload) as any,
      [bridge]
    );
    return useMemo(() => plugin.methods(call), [call, plugin]) as ReturnType<TPlugin['methods']>;
  }

  return { BridgeProvider, useBridge, useAction, useEvent, usePlugin };
}

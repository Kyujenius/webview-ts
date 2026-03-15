import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { createBridge } from '@ts-bridge/core';
import type { BridgeManager } from '@ts-bridge/core';
import type {
  BridgeConfig,
  BridgeCallOptions,
  ActionDefinitionShape,
  ActionNames,
  InferPayload,
  InferResponse,
} from '@ts-bridge/shared';

interface BridgeContextValue<TActions extends Record<string, ActionDefinitionShape>> {
  bridge: BridgeManager<TActions>;
  isAvailable: boolean;
}

export interface TypedBridgeProviderProps {
  config?: BridgeConfig;
  children: React.ReactNode;
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
  TActions extends Record<string, ActionDefinitionShape> = Record<string, ActionDefinitionShape>,
>() {
  const Context = createContext<BridgeContextValue<TActions> | null>(null);

  function useTypedContext(): BridgeContextValue<TActions> {
    const ctx = useContext(Context);
    if (!ctx)
      throw new Error('useBridge/useAction/useEvent must be used within a <BridgeProvider>');
    return ctx;
  }

  // ---- BridgeProvider ----

  function BridgeProvider({ config, children }: TypedBridgeProviderProps) {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const bridge = useMemo(() => createBridge<TActions>(config), []);
    const [isAvailable, setIsAvailable] = useState(() => bridge.isAvailable());
    useEffect(() => {
      setIsAvailable(bridge.isAvailable());
      return () => {
        bridge.destroy();
      };
    }, [bridge]);
    const value = useMemo(() => ({ bridge, isAvailable }), [bridge, isAvailable]);
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  // ---- useBridge ----

  function useBridge() {
    const { bridge, isAvailable } = useTypedContext();
    const call = useCallback(
      <TAction extends ActionNames<TActions>>(
        action: TAction,
        payload: InferPayload<TActions, TAction>,
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
    return { call, on, off, isAvailable };
  }

  // ---- useAction ----

  function useAction<TAction extends ActionNames<TActions>>(
    action: TAction,
    defaultOptions?: BridgeCallOptions
  ) {
    type TResponse = InferResponse<TActions, TAction>;
    const { bridge } = useTypedContext();
    const [data, setData] = useState<TResponse | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const execute = useCallback(
      async (
        payload: InferPayload<TActions, TAction>,
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

  return { BridgeProvider, useBridge, useAction, useEvent };
}

import { useState, useCallback } from 'react';
import type {
  ActionDefinitionShape,
  ActionNames,
  InferPayload,
  InferResponse,
  BridgeCallOptions,
} from '@webview-ts/shared';
import { useBridgeContext } from './BridgeContext';

export interface UseActionReturn<
  TActions extends Record<string, ActionDefinitionShape>,
  TAction extends ActionNames<TActions>,
> {
  execute: (
    payload: InferPayload<TActions, TAction>,
    options?: BridgeCallOptions
  ) => Promise<InferResponse<TActions, TAction>>;
  data: InferResponse<TActions, TAction> | null;
  error: Error | null;
  isLoading: boolean;
  reset: () => void;
}

export function useAction<
  TActions extends Record<string, ActionDefinitionShape> = Record<string, ActionDefinitionShape>,
  TAction extends ActionNames<TActions> = ActionNames<TActions>,
>(action: TAction, defaultOptions?: BridgeCallOptions): UseActionReturn<TActions, TAction> {
  type TResponse = InferResponse<TActions, TAction>;
  const { bridge } = useBridgeContext<TActions>();
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

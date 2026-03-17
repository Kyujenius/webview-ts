import { useState, useCallback } from 'react';
import type { BridgeManager } from '@webview-ts/core';
import type {
  ActionDefinitionShape,
  ActionNames,
  InferPayload,
  InferResponse,
  BridgeCallOptions,
} from '@webview-ts/shared';

export function useActionCore<
  TActions extends Record<string, ActionDefinitionShape>,
  TAction extends ActionNames<TActions>,
>(bridge: BridgeManager<TActions>, action: TAction, defaultOptions?: BridgeCallOptions) {
  type TResponse = InferResponse<TActions, TAction>;
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

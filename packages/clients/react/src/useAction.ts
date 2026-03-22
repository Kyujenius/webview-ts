import type {
  ActionMapBase,
  ActionNames,
  ActionStatus,
  BridgeCallOptions,
  InferPayload,
  InferResponse,
  UseActionOptions,
} from '@webview-ts/shared';

import { useBridgeContext } from './BridgeContext';
import { useActionCore } from './internal/useActionCore';

export interface UseActionReturn<
  TActions extends ActionMapBase,
  TAction extends ActionNames<TActions>,
> {
  status: ActionStatus;
  execute: (
    payload: InferPayload<TActions, TAction>,
    options?: BridgeCallOptions
  ) => Promise<InferResponse<TActions, TAction>>;
  data: InferResponse<TActions, TAction> | null;
  error: Error | null;
  isLoading: boolean;
  reset: () => void;
  invalidateCache: () => void;
}

export function useAction<
  TActions extends ActionMapBase = ActionMapBase,
  TAction extends ActionNames<TActions> = ActionNames<TActions>,
>(action: TAction, defaultOptions?: UseActionOptions): UseActionReturn<TActions, TAction> {
  const { bridge } = useBridgeContext<TActions>();
  return useActionCore(bridge, action, defaultOptions);
}

import type {
  ActionMapBase,
  ActionNames,
  BridgeCallOptions,
  ActionStatus,
} from '@webview-ts/shared';
import { useBridgeContext } from './BridgeContext';
import { useActionCore } from './internal/useActionCore';

export interface UseActionReturn<
  TActions extends ActionMapBase,
  TAction extends ActionNames<TActions>,
> {
  status: ActionStatus;
  execute: (
    payload: import('@webview-ts/shared').InferPayload<TActions, TAction>,
    options?: BridgeCallOptions
  ) => Promise<import('@webview-ts/shared').InferResponse<TActions, TAction>>;
  data: import('@webview-ts/shared').InferResponse<TActions, TAction> | null;
  error: Error | null;
  isLoading: boolean;
  reset: () => void;
}

export function useAction<
  TActions extends ActionMapBase = ActionMapBase,
  TAction extends ActionNames<TActions> = ActionNames<TActions>,
>(action: TAction, defaultOptions?: BridgeCallOptions): UseActionReturn<TActions, TAction> {
  const { bridge } = useBridgeContext<TActions>();
  return useActionCore(bridge, action, defaultOptions);
}

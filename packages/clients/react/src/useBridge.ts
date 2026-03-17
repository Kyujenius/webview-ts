import type {
  ActionDefinitionShape,
  ActionNames,
  InferPayload,
  InferResponse,
  BridgeCallOptions,
} from '@webview-ts/shared';
import { useBridgeContext } from './BridgeContext';
import { useBridgeCore } from './internal/useBridgeCore';

export interface UseBridgeReturn<
  TActions extends Record<string, ActionDefinitionShape> = Record<string, ActionDefinitionShape>,
> {
  call: <TAction extends ActionNames<TActions>>(
    action: TAction,
    payload: InferPayload<TActions, TAction>,
    options?: BridgeCallOptions
  ) => Promise<InferResponse<TActions, TAction>>;
  on: <TPayload = unknown>(event: string, handler: (payload: TPayload) => void) => () => void;
  off: (event: string, handler?: (payload: unknown) => void) => void;
  isAvailable: boolean;
}

export function useBridge<
  TActions extends Record<string, ActionDefinitionShape> = Record<string, ActionDefinitionShape>,
>(): UseBridgeReturn<TActions> {
  const { bridge, isAvailable } = useBridgeContext<TActions>();
  const { call, on, off } = useBridgeCore(bridge);
  return { call, on, off, isAvailable };
}

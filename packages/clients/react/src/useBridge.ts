import { useCallback } from 'react';
import type {
  ActionDefinitionShape,
  ActionNames,
  InferPayload,
  InferResponse,
  BridgeCallOptions,
} from '@ts-bridge/shared';
import { useBridgeContext } from './BridgeContext';

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
  const call = useCallback(
    <TAction extends ActionNames<TActions>>(
      action: TAction,
      payload: InferPayload<TActions, TAction>,
      options?: BridgeCallOptions
    ) => bridge.call(action, payload, options),
    [bridge]
  );
  const on = useCallback(
    <TPayload = unknown>(event: string, handler: (payload: TPayload) => void) =>
      bridge.on(event, handler),
    [bridge]
  );
  const off = useCallback(
    (event: string, handler?: (payload: unknown) => void) => bridge.off(event, handler),
    [bridge]
  );
  return { call, on, off, isAvailable };
}

import { useCallback } from 'react';
import type { BridgeManager } from '@webview-ts/core';
import type {
  ActionDefinitionShape,
  ActionNames,
  InferPayload,
  BridgeCallOptions,
} from '@webview-ts/shared';

export function useBridgeCore<
  TActions extends Record<string, ActionDefinitionShape>,
  TEvents extends Record<string, unknown>,
>(bridge: BridgeManager<TActions, TEvents>) {
  const call = useCallback(
    <TAction extends ActionNames<TActions>>(
      action: TAction,
      payload: InferPayload<TActions, TAction>,
      options?: BridgeCallOptions
    ) => bridge.call(action, payload, options),
    [bridge]
  );
  const on = useCallback(
    <K extends string & keyof TEvents>(event: K, handler: (payload: TEvents[K]) => void) =>
      bridge.on(event, handler),
    [bridge]
  );
  const off = useCallback(
    <K extends string & keyof TEvents>(event: K, handler?: (payload: TEvents[K]) => void) =>
      bridge.off(event, handler),
    [bridge]
  );
  return { call, on, off };
}

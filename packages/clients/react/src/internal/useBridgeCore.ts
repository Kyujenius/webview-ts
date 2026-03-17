import { useCallback } from 'react';
import type { BridgeManager } from '@webview-ts/core';
import type {
  ActionDefinitionShape,
  ActionNames,
  InferPayload,
  BridgeCallOptions,
} from '@webview-ts/shared';

export function useBridgeCore<TActions extends Record<string, ActionDefinitionShape>>(
  bridge: BridgeManager<TActions>
) {
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
  return { call, on, off };
}

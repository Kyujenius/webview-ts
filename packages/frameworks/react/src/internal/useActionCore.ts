import type { BridgeClient } from '@webview-ts/core';
import type { ActionMapBase, ActionNames, UseActionOptions } from '@webview-ts/shared';
import { useMemo, useSyncExternalStore } from 'react';

export function useActionCore<
  TActions extends ActionMapBase,
  TAction extends ActionNames<TActions>,
>(bridge: BridgeClient<TActions>, action: TAction, defaultOptions?: UseActionOptions) {
  const manager = useMemo(
    () => bridge.createActionState(action, defaultOptions),
    [bridge, action, defaultOptions]
  );

  // useSyncExternalStore: pull model — Concurrent Mode safe
  const state = useSyncExternalStore(manager.subscribe, manager.getSnapshot);

  return {
    status: state.status,
    data: state.data,
    error: state.error,
    isLoading: state.isLoading,
    execute: manager.execute,
    reset: manager.reset,
    invalidateCache: manager.invalidateCache,
  };
}

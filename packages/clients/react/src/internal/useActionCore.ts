import { useMemo } from 'react';
import { useSyncExternalStore } from 'use-sync-external-store/shim';
import type { BridgeManager } from '@webview-ts/core';
import type { ActionMapBase, ActionNames, BridgeCallOptions } from '@webview-ts/shared';

export function useActionCore<
  TActions extends ActionMapBase,
  TAction extends ActionNames<TActions>,
>(bridge: BridgeManager<TActions>, action: TAction, defaultOptions?: BridgeCallOptions) {
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
  };
}

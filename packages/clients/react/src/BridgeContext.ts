import { createContext, useContext } from 'react';
import type { BridgeManager } from '@webview-ts/core';
import type { ActionMapBase, ConnectionMode } from '@webview-ts/shared';

export interface BridgeContextValue<TActions extends ActionMapBase = ActionMapBase> {
  bridge: BridgeManager<TActions>;
  isAvailable: boolean;
  connectionMode: ConnectionMode;
}

export const BridgeContext = createContext<BridgeContextValue | null>(null);

export function useBridgeContext<
  TActions extends ActionMapBase = ActionMapBase,
>(): BridgeContextValue<TActions> {
  const context = useContext(BridgeContext);
  if (!context) throw new Error('useBridgeContext must be used within a <BridgeProvider>');
  return context as unknown as BridgeContextValue<TActions>;
}

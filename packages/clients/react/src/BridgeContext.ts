import { createContext, useContext } from 'react';
import type { BridgeManager } from '@ts-bridge/core';
import type { ActionDefinitionShape } from '@ts-bridge/shared';

export interface BridgeContextValue<
  TActions extends Record<string, ActionDefinitionShape> = Record<string, ActionDefinitionShape>,
> {
  bridge: BridgeManager<TActions>;
  isAvailable: boolean;
}

export const BridgeContext = createContext<BridgeContextValue | null>(null);

export function useBridgeContext<
  TActions extends Record<string, ActionDefinitionShape> = Record<string, ActionDefinitionShape>,
>(): BridgeContextValue<TActions> {
  const context = useContext(BridgeContext);
  if (!context) throw new Error('useBridgeContext must be used within a <BridgeProvider>');
  return context as BridgeContextValue<TActions>;
}

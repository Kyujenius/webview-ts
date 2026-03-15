import React, { useMemo, useState, useEffect } from 'react';
import { createBridge } from '@ts-bridge/core';
import type { BridgeConfig, ActionDefinitionShape } from '@ts-bridge/shared';
import { BridgeContext } from './BridgeContext';

export interface BridgeProviderProps<
  TActions extends Record<string, ActionDefinitionShape> = Record<string, ActionDefinitionShape>,
> {
  config?: BridgeConfig;
  children: React.ReactNode;
}

export function BridgeProvider<
  TActions extends Record<string, ActionDefinitionShape> = Record<string, ActionDefinitionShape>,
>({ config, children }: BridgeProviderProps<TActions>) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bridge = useMemo(() => createBridge<TActions>(config), []);
  const [isAvailable, setIsAvailable] = useState(() => bridge.isAvailable());
  useEffect(() => {
    setIsAvailable(bridge.isAvailable());
    return () => { bridge.destroy(); };
  }, [bridge]);
  const value = useMemo(() => ({ bridge, isAvailable }), [bridge, isAvailable]);
  return <BridgeContext.Provider value={value}>{children}</BridgeContext.Provider>;
}

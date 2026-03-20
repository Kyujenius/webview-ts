import React, { useMemo, useState, useEffect } from 'react';
import { createClient } from '@webview-ts/core';
import type { BridgeConfig } from '@webview-ts/shared';
import { BridgeContext } from './BridgeContext';

export interface BridgeProviderProps {
  config?: BridgeConfig;
  children: React.ReactNode;
}

export function BridgeProvider({ config, children }: BridgeProviderProps) {
  const bridge = useMemo(() => createClient(config), []);
  const [isAvailable, setIsAvailable] = useState(() => bridge.isAvailable());
  const [connectionMode, setConnectionMode] = useState(() => bridge.connectionMode);
  useEffect(() => {
    setIsAvailable(bridge.isAvailable());
    setConnectionMode(bridge.connectionMode);
    return () => {
      bridge.destroy();
    };
  }, [bridge]);
  const value = useMemo(
    () => ({ bridge, isAvailable, connectionMode }),
    [bridge, isAvailable, connectionMode]
  );
  return <BridgeContext.Provider value={value}>{children}</BridgeContext.Provider>;
}

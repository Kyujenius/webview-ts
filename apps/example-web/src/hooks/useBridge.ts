import { useEffect, useState } from 'react';
import { BridgeManager } from '@ts-bridge/core';

let bridgeInstance: BridgeManager | null = null;

/**
 * Get or create the bridge manager instance
 */
export function getBridge(): BridgeManager {
  if (!bridgeInstance) {
    bridgeInstance = new BridgeManager({
      timeout: 5000,
    });
  }
  return bridgeInstance;
}

/**
 * Hook to access the bridge manager
 */
export function useBridge() {
  const [bridge] = useState(() => getBridge());
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    setIsAvailable(bridge.isAvailable());
  }, [bridge]);

  return {
    bridge,
    isAvailable,
  };
}

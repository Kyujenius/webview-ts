import { computed, inject } from 'vue';

import { BRIDGE_KEY, type BridgeContext } from '../bridgeKey';

export function useBridge() {
  const ctx = inject<BridgeContext>(BRIDGE_KEY);
  if (!ctx) {
    throw new Error(
      '[webview-ts/vue] useBridge() called without BridgeProvider. Wrap your app with the install plugin from createBridgeVue().'
    );
  }
  return {
    bridge: ctx.bridge,
    isAvailable: computed(() => ctx.isAvailable),
    connectionMode: computed(() => ctx.connectionMode),
  };
}

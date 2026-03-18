import { inject, onScopeDispose } from 'vue';
import { BRIDGE_KEY } from '../bridgeKey';

export function useEvent<TPayload = unknown>(
  event: string,
  handler: (payload: TPayload) => void
): void {
  const ctx = inject(BRIDGE_KEY);
  if (!ctx) {
    throw new Error('[webview-ts/vue] useEvent() called without BridgeProvider.');
  }
  const unsubscribe = ctx.bridge.on(event, handler as (payload: unknown) => void);
  onScopeDispose(unsubscribe);
}

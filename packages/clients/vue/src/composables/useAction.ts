import { ref, onScopeDispose, inject } from 'vue';
import { BRIDGE_KEY } from '../bridgeKey';
import type { ActionState } from '@webview-ts/shared';

export function useAction(action: string) {
  const ctx = inject(BRIDGE_KEY);
  if (!ctx) {
    throw new Error(
      '[webview-ts/vue] useAction() called without BridgeProvider. Wrap your app with the install plugin from createBridgeVue().'
    );
  }

  const manager = ctx.bridge.createActionState(action);
  const initial = manager.getSnapshot();

  const status = ref(initial.status);
  const data = ref(initial.data);
  const error = ref<Error | null>(initial.error);
  const isLoading = ref(initial.isLoading);

  const unwatch = manager.watch((state: ActionState<any>) => {
    status.value = state.status;
    data.value = state.data;
    error.value = state.error;
    isLoading.value = state.isLoading;
  });

  onScopeDispose(unwatch);

  return {
    status,
    data,
    error,
    isLoading,
    execute: manager.execute,
    reset: manager.reset,
  };
}

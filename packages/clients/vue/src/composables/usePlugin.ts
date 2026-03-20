import { ref, onScopeDispose, inject } from 'vue';
import { BRIDGE_KEY } from '../bridgeKey';
import type { ActionState } from '@webview-ts/shared';
import type { TypedEventSubscriber } from '@webview-ts/shared';

export function usePlugin(plugin: any) {
  const ctx = inject(BRIDGE_KEY);
  if (!ctx) {
    throw new Error(
      '[webview-ts/vue] usePlugin() called without BridgeProvider. Wrap your app with the install plugin from createBridgeVue().'
    );
  }

  const result: Record<string, any> = {};
  const disposers: Array<() => void> = [];

  for (const [shortName, fullName] of Object.entries(plugin.actions)) {
    const manager = ctx.bridge.createActionState(fullName as string);
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
    disposers.push(unwatch);

    result[shortName] = {
      status,
      data,
      error,
      isLoading,
      execute: manager.execute,
      reset: manager.reset,
    };
  }

  result.on = ((eventName: string, handler: (payload: any) => void) => {
    const fullName = `${plugin.name}.${eventName}`;
    return ctx.bridge.on(fullName, handler);
  }) as TypedEventSubscriber<typeof plugin._eventTypes>;

  onScopeDispose(() => disposers.forEach((fn) => fn()));

  return result;
}

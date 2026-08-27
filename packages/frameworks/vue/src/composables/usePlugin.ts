import type {
  ActionState,
  AnyPlugin,
  PluginActionHandle,
  PluginActionPayloadIn,
  PluginActionResponse,
  StrictKeyOf,
  TypedEventSubscriber,
} from '@webview-ts/shared';
import { inject, onScopeDispose, type Ref, ref } from 'vue';

import { BRIDGE_KEY } from '../bridgeKey';

/** Live state + controls for one action — the shared PluginActionHandle with
 *  its state fields Ref-wrapped for Vue reactivity */
export type VuePluginActionHandle<TPayloadIn, TResponse> = {
  [K in keyof ActionState<TResponse>]: Ref<ActionState<TResponse>[K]>;
} & Pick<PluginActionHandle<TPayloadIn, TResponse>, 'execute' | 'reset'>;

/** Full result of usePlugin: one typed handle per action + typed event subscriber */
export type VueUsePluginResult<TPlugin extends AnyPlugin> = {
  [K in StrictKeyOf<TPlugin['actions']>]: VuePluginActionHandle<
    PluginActionPayloadIn<TPlugin, K>,
    PluginActionResponse<TPlugin, K>
  >;
} & { on: TypedEventSubscriber<TPlugin['_eventTypes']> };

export function usePlugin<TPlugin extends AnyPlugin>(plugin: TPlugin): VueUsePluginResult<TPlugin> {
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

  result.on = (eventName: string, handler: (payload: any) => void) => {
    const fullName = `${plugin.name}.${eventName}`;
    return ctx.bridge.on(fullName, handler);
  };

  onScopeDispose(() => disposers.forEach((fn) => fn()));

  return result as VueUsePluginResult<TPlugin>;
}

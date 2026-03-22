import type { App, Plugin } from 'vue';
import { inject, onScopeDispose } from 'vue';
import { BridgeClient } from '@webview-ts/core';
import { mergeFallbacks } from '@webview-ts/shared';
import type {
  BridgeConfig,
  ActionMapBase,
  EventMapBase,
  EventNames,
  Middleware,
} from '@webview-ts/shared';
import type {
  AnyPluginList,
  EmptyEventMap,
  MergePluginActions,
  MergePluginEvents,
} from '@webview-ts/shared';
import { BRIDGE_KEY } from './bridgeKey';
import { useBridge } from './composables/useBridge';
import { useAction } from './composables/useAction';
import { usePlugin } from './composables/usePlugin';

export interface CreateBridgeVueOptions<
  TPlugins extends AnyPluginList = [],
  TCustomEvents extends EventMapBase = EmptyEventMap,
> {
  config?: BridgeConfig;
  plugins?: TPlugins;
  /** Global middleware — registered in order (outermost first). */
  middleware?: Middleware[];
  /** Zero-cost event type marker for custom events. Use `{} as MyEvents`. */
  events?: TCustomEvents;
}

export function createBridgeVue<
  TCustomActions extends ActionMapBase = EmptyEventMap,
  const TPlugins extends AnyPluginList = [],
  TCustomEvents extends EventMapBase = EmptyEventMap,
>(
  options?: CreateBridgeVueOptions<TPlugins, TCustomEvents>
): Plugin & {
  useBridge: typeof useBridge;
  useAction: typeof useAction;
  usePlugin: typeof usePlugin;
  useEvent: <K extends EventNames<MergePluginEvents<TPlugins> & TCustomEvents>>(
    event: K,
    handler: (payload: (MergePluginEvents<TPlugins> & TCustomEvents)[K]) => void
  ) => void;
} {
  type TAllActions = MergePluginActions<TPlugins> & TCustomActions;
  type TAllEvents = MergePluginEvents<TPlugins> & TCustomEvents;

  function install(app: App) {
    const finalFallback = mergeFallbacks(options?.plugins, options?.config?.fallback);
    const finalConfig: BridgeConfig = { ...options?.config, fallback: finalFallback };
    const bridge = new BridgeClient<TAllActions, TAllEvents>(finalConfig);

    bridge.applyPlugins(options?.plugins, options?.middleware);

    bridge.connect();

    app.provide(BRIDGE_KEY, {
      bridge,
      isAvailable: bridge.isAvailable(),
      connectionMode: bridge.connectionMode,
    });

    // Cleanup on app unmount
    app.config.globalProperties.$webviewBridgeCleanup = () => bridge.destroy();
  }

  // Typed useEvent — closured to access TAllEvents
  function useTypedEvent<K extends EventNames<TAllEvents>>(
    event: K,
    handler: (payload: TAllEvents[K]) => void
  ): void {
    const ctx = inject(BRIDGE_KEY);
    if (!ctx) {
      throw new Error('[webview-ts/vue] useEvent() called without BridgeProvider.');
    }
    const unsubscribe = ctx.bridge.on(event as string, handler as (payload: unknown) => void);
    onScopeDispose(unsubscribe);
  }

  return { install, useBridge, useAction, usePlugin, useEvent: useTypedEvent as any };
}

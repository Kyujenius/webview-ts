import type { App, Plugin } from 'vue';
import { inject, onScopeDispose } from 'vue';
import { BridgeClient } from '@webview-ts/core';
import type {
  BridgeConfig,
  FallbackMap,
  ActionMapBase,
  EventMapBase,
  EventNames,
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
    // Collect fallbacks from plugins
    let pluginFallback: FallbackMap = {};
    if (options?.plugins) {
      for (const plugin of options.plugins) {
        if (plugin.fallback) {
          pluginFallback = { ...pluginFallback, ...plugin.fallback };
        }
      }
    }

    // Merge: plugin fallback (base) + config fallback (override)
    const configFallback = options?.config?.fallback;
    let finalFallback: BridgeConfig['fallback'];
    if (Object.keys(pluginFallback).length > 0) {
      const configHandlers =
        configFallback && typeof configFallback === 'object' && !('mode' in configFallback)
          ? (configFallback as FallbackMap)
          : configFallback && typeof configFallback === 'object' && 'handlers' in configFallback
            ? ((configFallback as { handlers?: FallbackMap }).handlers ?? {})
            : {};
      finalFallback = { ...pluginFallback, ...configHandlers };
    } else {
      finalFallback = configFallback;
    }

    const finalConfig: BridgeConfig = { ...options?.config, fallback: finalFallback };
    const bridge = new BridgeClient<TAllActions, TAllEvents>(finalConfig);

    // Register interceptors and timeouts from plugins
    if (options?.plugins) {
      for (const plugin of options.plugins) {
        if (plugin.interceptors && Object.keys(plugin.interceptors).length > 0) {
          bridge.registerInterceptors(plugin.interceptors);
        }
        if (plugin.timeouts && Object.keys(plugin.timeouts).length > 0) {
          bridge.registerTimeouts(plugin.timeouts);
        }
      }
    }

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

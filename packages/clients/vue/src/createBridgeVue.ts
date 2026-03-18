import type { App, Plugin } from 'vue';
import { BridgeManager } from '@webview-ts/core';
import type { BridgeConfig, FallbackMap } from '@webview-ts/shared';
import type { PluginInstance } from '@webview-ts/shared';
import { BRIDGE_KEY } from './bridgeKey';
import { useBridge } from './composables/useBridge';
import { useAction } from './composables/useAction';
import { usePlugin } from './composables/usePlugin';
import { useEvent } from './composables/useEvent';

export interface CreateBridgeVueOptions {
  config?: BridgeConfig;
  plugins?: PluginInstance<any, any, any>[];
}

export function createBridgeVue(options?: CreateBridgeVueOptions): Plugin & {
  useBridge: typeof useBridge;
  useAction: typeof useAction;
  usePlugin: typeof usePlugin;
  useEvent: typeof useEvent;
} {
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
    const bridge = new BridgeManager(finalConfig);

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

  return { install, useBridge, useAction, usePlugin, useEvent };
}

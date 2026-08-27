import type { AnyPlugin } from '../plugins/instance';
import type { BridgeConfig, FallbackMap } from '../types/bridge';

/**
 * Collect fallback handlers from plugins and merge with config fallback.
 * Plugin fallbacks are the base; config fallback overrides.
 */
export function mergeFallbacks(
  plugins: AnyPlugin[] | undefined,
  configFallback: BridgeConfig['fallback']
): BridgeConfig['fallback'] {
  let pluginFallback: FallbackMap = {};
  if (plugins) {
    for (const plugin of plugins) {
      if (plugin.fallback) {
        pluginFallback = { ...pluginFallback, ...plugin.fallback };
      }
    }
  }

  if (Object.keys(pluginFallback).length === 0) {
    return configFallback;
  }

  const configHandlers =
    configFallback && typeof configFallback !== 'boolean' ? configFallback : {};

  return { ...pluginFallback, ...configHandlers };
}

import type { BridgeConfig, FallbackMap, FallbackConfig } from '../types/bridge';
import type { AnyPlugin } from '../plugins/types';

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
    configFallback && typeof configFallback === 'object' && !('mode' in configFallback)
      ? (configFallback as FallbackMap)
      : configFallback && typeof configFallback === 'object' && 'handlers' in configFallback
        ? ((configFallback as FallbackConfig).handlers ?? {})
        : {};

  return { ...pluginFallback, ...configHandlers };
}

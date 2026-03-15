/**
 * Registry for managing plugins
 */

import type { WebPlugin, PluginRegistry as IPluginRegistry } from '@ts-bridge/shared';

/**
 * Plugin registry implementation
 */
export class PluginRegistry implements IPluginRegistry {
  private plugins = new Map<string, WebPlugin>();

  /**
   * Register a plugin
   */
  register<T = unknown>(plugin: WebPlugin<T>): void {
    if (this.plugins.has(plugin.metadata.name)) {
      throw new Error(`Plugin '${plugin.metadata.name}' is already registered`);
    }

    this.plugins.set(plugin.metadata.name, plugin);
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginName: string): void {
    const plugin = this.plugins.get(pluginName);

    if (plugin && plugin.destroy) {
      plugin.destroy().catch((error) => {
        console.error(`[ts-bridge] Error destroying plugin '${pluginName}':`, error);
      });
    }

    this.plugins.delete(pluginName);
  }

  /**
   * Get a registered plugin
   */
  get(pluginName: string): WebPlugin | undefined {
    return this.plugins.get(pluginName);
  }

  /**
   * Check if plugin is registered
   */
  has(pluginName: string): boolean {
    return this.plugins.has(pluginName);
  }

  /**
   * Get all registered plugins
   */
  getAll(): WebPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    // Destroy all plugins
    for (const plugin of this.plugins.values()) {
      if (plugin.destroy) {
        plugin.destroy().catch((error) => {
          console.error(`[ts-bridge] Error destroying plugin '${plugin.metadata.name}':`, error);
        });
      }
    }

    this.plugins.clear();
  }

  /**
   * Get plugin count
   */
  size(): number {
    return this.plugins.size;
  }
}

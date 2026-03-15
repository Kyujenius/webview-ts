import type { NativePlugin, PluginMetadata } from '@ts-bridge/shared';
import type { BridgeHost } from '../bridge/BridgeHost';

/**
 * Configuration for PluginHost
 */
export interface PluginHostConfig {
  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Auto-initialize plugins on registration
   */
  autoInitialize?: boolean;

  /**
   * Custom error handler
   */
  onError?: (error: Error, context?: unknown) => void;
}

/**
 * Plugin lifecycle state
 */
export enum PluginState {
  REGISTERED = 'registered',
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',
  ERROR = 'error',
  DESTROYED = 'destroyed',
}

/**
 * Plugin entry with state tracking
 */
interface PluginEntry {
  plugin: NativePlugin;
  state: PluginState;
  error?: Error;
}

/**
 * PluginHost - Manages native plugins
 * Handles plugin lifecycle, dependencies, and execution
 */
export class PluginHost {
  private config: Required<PluginHostConfig>;
  private bridgeHost: BridgeHost;
  private plugins: Map<string, PluginEntry>;

  constructor(bridgeHost: BridgeHost, config: PluginHostConfig = {}) {
    this.config = {
      debug: config.debug ?? false,
      autoInitialize: config.autoInitialize ?? true,
      onError: config.onError ?? ((error) => console.error('[PluginHost]', error)),
    };
    this.bridgeHost = bridgeHost;
    this.plugins = new Map();
  }

  /**
   * Register a native plugin
   */
  async registerPlugin(plugin: NativePlugin): Promise<void> {
    const { name } = plugin.metadata;

    if (this.plugins.has(name)) {
      throw new Error(`Plugin '${name}' is already registered`);
    }

    // Add to registry
    this.plugins.set(name, {
      plugin,
      state: PluginState.REGISTERED,
    });

    this.log(`Registered plugin: ${name}`);

    // Auto-initialize if enabled
    if (this.config.autoInitialize) {
      await this.initializePlugin(name);
    }
  }

  /**
   * Initialize a plugin
   */
  async initializePlugin(pluginName: string): Promise<void> {
    const entry = this.plugins.get(pluginName);

    if (!entry) {
      throw new Error(`Plugin '${pluginName}' not found`);
    }

    if (entry.state === PluginState.INITIALIZED) {
      this.log(`Plugin '${pluginName}' already initialized`);
      return;
    }

    if (entry.state === PluginState.INITIALIZING) {
      throw new Error(`Plugin '${pluginName}' is already being initialized`);
    }

    try {
      // Update state
      entry.state = PluginState.INITIALIZING;
      this.log(`Initializing plugin: ${pluginName}`);

      // Check dependencies
      if (entry.plugin.metadata.dependencies) {
        for (const dep of entry.plugin.metadata.dependencies) {
          const depEntry = this.plugins.get(dep);

          if (!depEntry) {
            throw new Error(`Plugin '${pluginName}' requires dependency '${dep}' which is not registered`);
          }

          if (depEntry.state !== PluginState.INITIALIZED) {
            // Initialize dependency first
            await this.initializePlugin(dep);
          }
        }
      }

      // Initialize plugin
      await entry.plugin.initialize(this.bridgeHost);

      // Update state
      entry.state = PluginState.INITIALIZED;
      entry.error = undefined;

      this.log(`Plugin '${pluginName}' initialized successfully`);
    } catch (error) {
      // Update state
      entry.state = PluginState.ERROR;
      entry.error = error instanceof Error ? error : new Error(String(error));

      this.config.onError(entry.error, { plugin: pluginName });
      throw error;
    }
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(pluginName: string): Promise<void> {
    const entry = this.plugins.get(pluginName);

    if (!entry) {
      this.log(`Plugin '${pluginName}' not found`);
      return;
    }

    try {
      // Check if other plugins depend on this one
      for (const [name, otherEntry] of this.plugins.entries()) {
        if (name === pluginName) continue;

        const deps = otherEntry.plugin.metadata.dependencies || [];
        if (deps.includes(pluginName) && otherEntry.state === PluginState.INITIALIZED) {
          throw new Error(
            `Cannot unregister plugin '${pluginName}' because '${name}' depends on it`
          );
        }
      }

      // Destroy plugin if it has destroy method
      if (entry.plugin.destroy && entry.state === PluginState.INITIALIZED) {
        await entry.plugin.destroy();
      }

      // Update state and remove
      entry.state = PluginState.DESTROYED;
      this.plugins.delete(pluginName);

      this.log(`Plugin '${pluginName}' unregistered`);
    } catch (error) {
      this.config.onError(
        error instanceof Error ? error : new Error(String(error)),
        { plugin: pluginName }
      );
      throw error;
    }
  }

  /**
   * Get plugin by name
   */
  getPlugin<T extends NativePlugin = NativePlugin>(pluginName: string): T | undefined {
    const entry = this.plugins.get(pluginName);
    return entry?.plugin as T | undefined;
  }

  /**
   * Get plugin state
   */
  getPluginState(pluginName: string): PluginState | undefined {
    return this.plugins.get(pluginName)?.state;
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): PluginMetadata[] {
    return Array.from(this.plugins.values()).map((entry) => entry.plugin.metadata);
  }

  /**
   * Check if plugin is registered
   */
  hasPlugin(pluginName: string): boolean {
    return this.plugins.has(pluginName);
  }

  /**
   * Check if plugin is initialized
   */
  isPluginInitialized(pluginName: string): boolean {
    const entry = this.plugins.get(pluginName);
    return entry?.state === PluginState.INITIALIZED;
  }

  /**
   * Get plugin error if any
   */
  getPluginError(pluginName: string): Error | undefined {
    return this.plugins.get(pluginName)?.error;
  }

  /**
   * Clean up all plugins
   */
  async destroy(): Promise<void> {
    const pluginNames = Array.from(this.plugins.keys());

    // Destroy plugins in reverse order of registration
    for (const name of pluginNames.reverse()) {
      try {
        await this.unregisterPlugin(name);
      } catch (error) {
        this.config.onError(
          error instanceof Error ? error : new Error(String(error)),
          { plugin: name }
        );
      }
    }

    this.plugins.clear();
    this.log('PluginHost destroyed');
  }

  /**
   * Internal logging
   */
  private log(message: string, data?: unknown): void {
    if (!this.config.debug) {
      return;
    }

    const prefix = '[PluginHost]';
    if (data !== undefined) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }
}

/**
 * Create a plugin host with the given bridge host
 */
export function createPluginHost(
  bridgeHost: BridgeHost,
  config?: PluginHostConfig
): PluginHost {
  return new PluginHost(bridgeHost, config);
}

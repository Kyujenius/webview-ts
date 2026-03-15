/**
 * Plugin system types and interfaces
 */

import type { Bridge, BridgeHost } from './bridge';

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  /**
   * Plugin name
   */
  name: string;

  /**
   * Plugin version
   */
  version: string;

  /**
   * Plugin description
   */
  description?: string;

  /**
   * Plugin author
   */
  author?: string;

  /**
   * Required permissions
   */
  permissions?: string[];

  /**
   * Plugin dependencies (other plugins that must be loaded first)
   */
  dependencies?: string[];
}

/**
 * Plugin configuration options
 */
export interface PluginConfig {
  /**
   * Enable/disable plugin
   * @default true
   */
  enabled?: boolean;

  /**
   * Plugin-specific options
   */
  options?: Record<string, unknown>;
}

/**
 * Web-side plugin interface
 */
export interface WebPlugin<TOptions = unknown> {
  /**
   * Plugin metadata
   */
  metadata: PluginMetadata;

  /**
   * Initialize plugin with bridge instance
   */
  initialize(bridge: Bridge, options?: TOptions): Promise<void>;

  /**
   * Cleanup plugin resources
   */
  destroy?(): Promise<void>;
}

/**
 * Native-side plugin interface
 */
export interface NativePlugin<TOptions = unknown> {
  /**
   * Plugin metadata
   */
  metadata: PluginMetadata;

  /**
   * Initialize plugin with bridge host
   */
  initialize(host: BridgeHost, options?: TOptions): Promise<void>;

  /**
   * Cleanup plugin resources
   */
  destroy?(): Promise<void>;
}

/**
 * Plugin registry interface
 */
export interface PluginRegistry {
  /**
   * Register a plugin
   */
  register<T = unknown>(plugin: WebPlugin<T> | NativePlugin<T>): void;

  /**
   * Unregister a plugin
   */
  unregister(pluginName: string): void;

  /**
   * Get a registered plugin
   */
  get(pluginName: string): WebPlugin | NativePlugin | undefined;

  /**
   * Check if plugin is registered
   */
  has(pluginName: string): boolean;

  /**
   * Get all registered plugins
   */
  getAll(): (WebPlugin | NativePlugin)[];
}

/**
 * Permission status
 */
export enum PermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  PROMPT = 'prompt',
  UNAVAILABLE = 'unavailable',
}

/**
 * Permission result
 */
export interface PermissionResult {
  /**
   * Permission status
   */
  status: PermissionStatus;

  /**
   * Additional info
   */
  message?: string;
}

/**
 * Permission manager interface
 */
export interface PermissionManager {
  /**
   * Request permission
   */
  request(permission: string): Promise<PermissionResult>;

  /**
   * Check permission status
   */
  check(permission: string): Promise<PermissionResult>;

  /**
   * Request multiple permissions
   */
  requestMultiple(permissions: string[]): Promise<Record<string, PermissionResult>>;
}

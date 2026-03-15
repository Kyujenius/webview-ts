import { PermissionStatus } from '@webview-ts/shared';
import { Platform } from 'react-native';

/**
 * Configuration for PermissionManager
 */
export interface PermissionManagerConfig {
  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Custom error handler
   */
  onError?: (error: Error) => void;
}

/**
 * Permission request result with additional platform info
 */
export interface PermissionResult {
  /**
   * Permission status
   */
  status: PermissionStatus;

  /**
   * Can show rationale (Android only)
   */
  canAskAgain?: boolean;

  /**
   * Additional info
   */
  message?: string;
}

/**
 * Permission handler function
 */
export type PermissionHandler = () => Promise<PermissionResult>;

/**
 * PermissionManager - Manages OS permissions
 * Handles permission requests, status checks, and rationale
 */
export class PermissionManager {
  private config: Required<PermissionManagerConfig>;
  private handlers: Map<string, PermissionHandler>;
  private cache: Map<string, PermissionResult>;

  constructor(config: PermissionManagerConfig = {}) {
    this.config = {
      debug: config.debug ?? false,
      onError: config.onError ?? ((error) => console.error('[PermissionManager]', error)),
    };
    this.handlers = new Map();
    this.cache = new Map();
  }

  /**
   * Register a permission handler
   */
  registerPermission(permission: string, handler: PermissionHandler): void {
    if (this.handlers.has(permission)) {
      throw new Error(`Permission handler for '${permission}' is already registered`);
    }

    this.handlers.set(permission, handler);
    this.log(`Registered permission handler: ${permission}`);
  }

  /**
   * Unregister a permission handler
   */
  unregisterPermission(permission: string): void {
    this.handlers.delete(permission);
    this.cache.delete(permission);
    this.log(`Unregistered permission handler: ${permission}`);
  }

  /**
   * Check permission status
   */
  async checkPermission(permission: string): Promise<PermissionStatus> {
    // Check cache first
    const cached = this.cache.get(permission);
    if (cached) {
      this.log(`Permission '${permission}' status from cache: ${cached.status}`);
      return cached.status;
    }

    // Get handler
    const handler = this.handlers.get(permission);
    if (!handler) {
      this.log(`No handler for permission '${permission}', assuming denied`);
      return PermissionStatus.DENIED;
    }

    try {
      // Execute handler
      const result = await handler();

      // Cache result
      this.cache.set(permission, result);

      this.log(`Permission '${permission}' status: ${result.status}`);
      return result.status;
    } catch (error) {
      this.config.onError(error instanceof Error ? error : new Error(String(error)));
      return PermissionStatus.DENIED;
    }
  }

  /**
   * Request permission
   */
  async requestPermission(permission: string): Promise<PermissionStatus> {
    // Get handler
    const handler = this.handlers.get(permission);
    if (!handler) {
      throw new Error(`No handler registered for permission: ${permission}`);
    }

    try {
      this.log(`Requesting permission: ${permission}`);

      // Execute handler
      const result = await handler();

      // Update cache
      this.cache.set(permission, result);

      this.log(`Permission '${permission}' request result: ${result.status}`);
      return result.status;
    } catch (error) {
      this.config.onError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Check if permission is granted
   */
  async hasPermission(permission: string): Promise<boolean> {
    const status = await this.checkPermission(permission);
    return status === PermissionStatus.GRANTED;
  }

  /**
   * Request multiple permissions
   */
  async requestPermissions(permissions: string[]): Promise<Record<string, PermissionStatus>> {
    const results: Record<string, PermissionStatus> = {};

    for (const permission of permissions) {
      try {
        results[permission] = await this.requestPermission(permission);
      } catch (error) {
        this.config.onError(error instanceof Error ? error : new Error(String(error)));
        results[permission] = PermissionStatus.DENIED;
      }
    }

    return results;
  }

  /**
   * Check if we can show permission rationale (Android only)
   */
  canShowRationale(permission: string): boolean {
    if (Platform.OS !== 'android') {
      return false;
    }

    const cached = this.cache.get(permission);
    return cached?.canAskAgain ?? true;
  }

  /**
   * Clear permission cache
   */
  clearCache(permission?: string): void {
    if (permission) {
      this.cache.delete(permission);
      this.log(`Cleared cache for permission: ${permission}`);
    } else {
      this.cache.clear();
      this.log('Cleared all permission cache');
    }
  }

  /**
   * Get all registered permissions
   */
  getRegisteredPermissions(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if permission handler is registered
   */
  hasPermissionHandler(permission: string): boolean {
    return this.handlers.has(permission);
  }

  /**
   * Get current platform
   */
  getPlatform(): string {
    return Platform.OS;
  }

  /**
   * Internal logging
   */
  private log(message: string, data?: unknown): void {
    if (!this.config.debug) {
      return;
    }

    const prefix = '[PermissionManager]';
    if (data !== undefined) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }
}

/**
 * Create a permission manager
 */
export function createPermissionManager(config?: PermissionManagerConfig): PermissionManager {
  return new PermissionManager(config);
}

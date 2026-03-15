/**
 * Storage plugin - Web side
 */

import { BaseWebPlugin } from '../utils/BaseWebPlugin';
import type { BridgeManager } from '@ts-bridge/core';
import {
  StorageAction,
  type StorageOptions,
  type MultiGetResult,
  type MultiSetInput,
  type StorageStats,
} from './types';

/**
 * Storage plugin for web-side
 */
export class StoragePlugin extends BaseWebPlugin<StorageAction> {
  private options: StorageOptions;

  constructor(bridge: BridgeManager, options: StorageOptions = {}) {
    super(bridge, {
      name: 'storage',
      version: '0.1.0',
      requiresNative: true,
      permissions: [],
    });
    this.options = options;
  }

  async handleAction<TPayload = unknown, TResult = unknown>(
    action: StorageAction,
    payload: TPayload
  ): Promise<TResult> {
    switch (action) {
      case StorageAction.GET_ITEM:
        return this.getItem((payload as { key: string }).key) as TResult;
      case StorageAction.SET_ITEM:
        return this.setItem(
          (payload as { key: string; value: string }).key,
          (payload as { key: string; value: string }).value
        ) as TResult;
      case StorageAction.REMOVE_ITEM:
        return this.removeItem((payload as { key: string }).key) as TResult;
      case StorageAction.CLEAR:
        return this.clear() as TResult;
      case StorageAction.GET_ALL_KEYS:
        return this.getAllKeys() as TResult;
      case StorageAction.MULTI_GET:
        return this.multiGet((payload as { keys: string[] }).keys) as TResult;
      case StorageAction.MULTI_SET:
        return this.multiSet((payload as { pairs: MultiSetInput }).pairs) as TResult;
      case StorageAction.MULTI_REMOVE:
        return this.multiRemove((payload as { keys: string[] }).keys) as TResult;
      default:
        throw new Error(`Unknown storage action: ${action}`);
    }
  }

  /**
   * Get item from storage
   */
  async getItem(key: string): Promise<string | null> {
    return this.sendToNative(StorageAction.GET_ITEM, { key, ...this.options });
  }

  /**
   * Set item in storage
   */
  async setItem(key: string, value: string): Promise<void> {
    await this.sendToNative(StorageAction.SET_ITEM, { key, value, ...this.options });
  }

  /**
   * Remove item from storage
   */
  async removeItem(key: string): Promise<void> {
    await this.sendToNative(StorageAction.REMOVE_ITEM, { key, ...this.options });
  }

  /**
   * Clear all items from storage
   */
  async clear(): Promise<void> {
    await this.sendToNative(StorageAction.CLEAR, this.options);
  }

  /**
   * Get all keys from storage
   */
  async getAllKeys(): Promise<string[]> {
    return this.sendToNative(StorageAction.GET_ALL_KEYS, this.options);
  }

  /**
   * Get multiple items
   */
  async multiGet(keys: string[]): Promise<MultiGetResult> {
    return this.sendToNative(StorageAction.MULTI_GET, { keys, ...this.options });
  }

  /**
   * Set multiple items
   */
  async multiSet(pairs: MultiSetInput): Promise<void> {
    await this.sendToNative(StorageAction.MULTI_SET, { pairs, ...this.options });
  }

  /**
   * Remove multiple items
   */
  async multiRemove(keys: string[]): Promise<void> {
    await this.sendToNative(StorageAction.MULTI_REMOVE, { keys, ...this.options });
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageStats> {
    const keys = await this.getAllKeys();
    return {
      keyCount: keys.length,
      totalSize: 0,
    };
  }

  /**
   * Get item as JSON
   */
  async getJSON<T = unknown>(key: string): Promise<T | null> {
    const value = await this.getItem(key);
    if (value === null) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  /**
   * Set item as JSON
   */
  async setJSON<T = unknown>(key: string, value: T): Promise<void> {
    await this.setItem(key, JSON.stringify(value));
  }
}

/**
 * Create storage plugin
 */
export function createStoragePlugin(
  bridge: BridgeManager,
  options?: StorageOptions
): StoragePlugin {
  return new StoragePlugin(bridge, options);
}

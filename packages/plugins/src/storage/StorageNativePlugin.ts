/**
 * Storage plugin - Native side
 */

import { BaseNativePlugin } from '../utils/BaseNativePlugin';
import {
  StorageAction,
  type MultiGetResult,
  type MultiSetInput,
} from './types';

/**
 * Storage plugin for React Native
 */
export class StorageNativePlugin extends BaseNativePlugin<StorageAction> {
  constructor() {
    super({
      name: 'storage',
      version: '0.1.0',
      requiresNative: true,
      permissions: [],
    });
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
  async getItem(_key: string): Promise<string | null> {
    throw new Error('Not implemented: Use @react-native-async-storage/async-storage in actual app');
  }

  /**
   * Set item in storage
   */
  async setItem(_key: string, _value: string): Promise<void> {
    throw new Error('Not implemented: Use @react-native-async-storage/async-storage in actual app');
  }

  /**
   * Remove item from storage
   */
  async removeItem(_key: string): Promise<void> {
    throw new Error('Not implemented: Use @react-native-async-storage/async-storage in actual app');
  }

  /**
   * Clear all items
   */
  async clear(): Promise<void> {
    throw new Error('Not implemented: Use @react-native-async-storage/async-storage in actual app');
  }

  /**
   * Get all keys
   */
  async getAllKeys(): Promise<string[]> {
    throw new Error('Not implemented: Use @react-native-async-storage/async-storage in actual app');
  }

  /**
   * Get multiple items
   */
  async multiGet(_keys: string[]): Promise<MultiGetResult> {
    throw new Error('Not implemented: Use @react-native-async-storage/async-storage in actual app');
  }

  /**
   * Set multiple items
   */
  async multiSet(_pairs: MultiSetInput): Promise<void> {
    throw new Error('Not implemented: Use @react-native-async-storage/async-storage in actual app');
  }

  /**
   * Remove multiple items
   */
  async multiRemove(_keys: string[]): Promise<void> {
    throw new Error('Not implemented: Use @react-native-async-storage/async-storage in actual app');
  }

  /**
   * Check permission (storage doesn't require permissions)
   */
  async checkPermission(_permission: string): Promise<boolean> {
    return true;
  }

  /**
   * Request permission (storage doesn't require permissions)
   */
  async requestPermission(_permission: string): Promise<boolean> {
    return true;
  }
}

/**
 * Create storage native plugin
 */
export function createStorageNativePlugin(): StorageNativePlugin {
  return new StorageNativePlugin();
}

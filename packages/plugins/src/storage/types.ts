/**
 * Storage plugin types
 */

/**
 * Storage actions
 */
export enum StorageAction {
  GET_ITEM = 'getItem',
  SET_ITEM = 'setItem',
  REMOVE_ITEM = 'removeItem',
  CLEAR = 'clear',
  GET_ALL_KEYS = 'getAllKeys',
  MULTI_GET = 'multiGet',
  MULTI_SET = 'multiSet',
  MULTI_REMOVE = 'multiRemove',
}

/**
 * Storage backend type
 */
export enum StorageBackend {
  ASYNC_STORAGE = 'asyncStorage',
  MMKV = 'mmkv',
  SECURE_STORAGE = 'secureStorage',
}

/**
 * Storage options
 */
export interface StorageOptions {
  backend?: StorageBackend;
  encryptionKey?: string;
  storageId?: string;
}

/**
 * Multi-get result
 */
export type MultiGetResult = Array<[string, string | null]>;

/**
 * Multi-set input
 */
export type MultiSetInput = Array<[string, string]>;

/**
 * Storage statistics
 */
export interface StorageStats {
  keyCount: number;
  totalSize: number;
  availableSpace?: number;
}

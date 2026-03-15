import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StoragePlugin } from './StoragePlugin';
import type { BridgeManager } from '@ts-bridge/core';

describe('StoragePlugin', () => {
  let mockBridge: BridgeManager;
  let plugin: StoragePlugin;

  beforeEach(() => {
    mockBridge = {
      isAvailable: vi.fn().mockReturnValue(true),
      call: vi.fn().mockImplementation((action) => {
        if (action === 'storage.getItem') {
          return Promise.resolve('test-value');
        }
        if (action === 'storage.getAllKeys') {
          return Promise.resolve(['key1', 'key2', 'key3']);
        }
        return Promise.resolve(null);
      }),
    } as unknown as BridgeManager;

    plugin = new StoragePlugin(mockBridge);
  });

  describe('getItem', () => {
    it('should get item from storage', async () => {
      const value = await plugin.getItem('test-key');

      expect(mockBridge.call).toHaveBeenCalledWith(
        'storage.getItem',
        expect.objectContaining({ key: 'test-key' })
      );
      expect(value).toBe('test-value');
    });
  });

  describe('setItem', () => {
    it('should set item in storage', async () => {
      await plugin.setItem('test-key', 'test-value');

      expect(mockBridge.call).toHaveBeenCalledWith(
        'storage.setItem',
        expect.objectContaining({
          key: 'test-key',
          value: 'test-value',
        })
      );
    });
  });

  describe('JSON operations', () => {
    it('should store and retrieve JSON', async () => {
      const data = { name: 'John', age: 30 };

      await plugin.setJSON('user', data);

      expect(mockBridge.call).toHaveBeenCalledWith(
        'storage.setItem',
        expect.objectContaining({
          key: 'user',
          value: JSON.stringify(data),
        })
      );
    });
  });

  describe('getAllKeys', () => {
    it('should get all keys', async () => {
      const keys = await plugin.getAllKeys();

      expect(mockBridge.call).toHaveBeenCalled();
      expect(keys).toEqual(['key1', 'key2', 'key3']);
    });
  });
});

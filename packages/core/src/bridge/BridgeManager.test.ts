import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BridgeManager } from './BridgeManager';

describe('BridgeManager', () => {
  let bridge: BridgeManager;

  beforeEach(() => {
    bridge = new BridgeManager({
      timeout: 5000,
      debug: false,
    });
  });

  describe('initialization', () => {
    it('should create bridge with default config', () => {
      const defaultBridge = new BridgeManager();
      const config = defaultBridge.getConfig();

      expect(config.timeout).toBe(0);
      expect(config.debug).toBe(false);
      expect(config.maxConcurrentRequests).toBe(100);
      expect(config.enableDeduplication).toBe(true);
    });

    it('should create bridge with custom config', () => {
      const customBridge = new BridgeManager({
        timeout: 10000,
        debug: true,
        maxConcurrentRequests: 50,
      });

      const config = customBridge.getConfig();
      expect(config.timeout).toBe(10000);
      expect(config.debug).toBe(true);
      expect(config.maxConcurrentRequests).toBe(50);
    });
  });

  describe('getConfig', () => {
    it('should return bridge configuration', () => {
      const config = bridge.getConfig();

      expect(config).toEqual({
        timeout: 5000,
        debug: false,
        maxConcurrentRequests: 100,
        enableDeduplication: true,
      });
    });
  });

  describe('event handling', () => {
    it('should subscribe to events', () => {
      const handler = vi.fn();
      const unsubscribe = bridge.on('testEvent', handler);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should unsubscribe from events', () => {
      const handler = vi.fn();
      const unsubscribe = bridge.on('testEvent', handler);

      unsubscribe();

      // Simulate event dispatch and verify handler is NOT called
      bridge['eventHandlers'].get('testEvent')?.forEach((h) => h({}));
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bridge.on('testEvent', handler1);
      bridge.on('testEvent', handler2);

      // Simulate event dispatch and verify both handlers are called
      const payload = { data: 'test' };
      bridge['eventHandlers'].get('testEvent')?.forEach((h) => h(payload));
      expect(handler1).toHaveBeenCalledWith(payload);
      expect(handler2).toHaveBeenCalledWith(payload);
    });
  });

  describe('destroy', () => {
    it('should clean up resources', () => {
      const handler = vi.fn();
      bridge.on('testEvent', handler);

      bridge.destroy();

      // After destroy, event handlers should be cleared
      expect(bridge['eventHandlers'].size).toBe(0);
    });
  });
});

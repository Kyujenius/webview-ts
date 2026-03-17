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

  describe('fallback normalization', () => {
    it('should treat true as enabled with no handlers', () => {
      const b = new BridgeManager({ fallback: true });
      expect(b.connectionMode).toBe('fallback');
    });

    it('should treat false as disabled', () => {
      const b = new BridgeManager({ fallback: false });
      expect(b.connectionMode).toBe('disconnected');
    });

    it('should treat undefined as disabled', () => {
      const b = new BridgeManager({});
      expect(b.connectionMode).toBe('disconnected');
    });

    it('should accept FallbackMap directly', () => {
      const b = new BridgeManager({
        fallback: { 'test.action': async () => 'ok' },
      });
      expect(b.connectionMode).toBe('fallback');
    });

    it('should accept explicit mode object with reject', () => {
      const b = new BridgeManager({ fallback: { mode: 'reject' } });
      expect(b.connectionMode).toBe('fallback');
    });

    it('should accept explicit mode object with mock and handlers', () => {
      const b = new BridgeManager({
        fallback: { mode: 'mock', handlers: { 'test.action': async () => 42 } },
      });
      expect(b.connectionMode).toBe('fallback');
    });
  });

  describe('destroy', () => {
    it('should preserve event handlers (only clears runtime state)', () => {
      const handler = vi.fn();
      bridge.on('testEvent', handler);

      bridge.destroy();

      // After destroy, event handlers should be preserved
      expect(bridge['eventHandlers'].size).toBe(1);
    });
  });
});

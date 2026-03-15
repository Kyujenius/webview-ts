import { describe, it, expect, afterEach, vi } from 'vitest';
import { BridgeManager } from './BridgeManager';

describe('BridgeManager - Cleanup', () => {
  let bridge: BridgeManager;

  afterEach(() => {
    bridge?.destroy();
  });

  describe('destroy()', () => {
    it('should clean up all resources', () => {
      bridge = new BridgeManager({ fallback: true });
      const handler = vi.fn();
      bridge.on('testEvent', handler);
      bridge.destroy();

      // Idempotent
      expect(() => bridge.destroy()).not.toThrow();
    });
  });

  describe('event handler lifecycle', () => {
    it('should not call handler after off()', () => {
      bridge = new BridgeManager({ fallback: true });
      const handler = vi.fn();
      bridge.on('test', handler);
      bridge.off('test', handler);

      // Trigger event via the global response handler
      const responseHandler = (window as any).__tsBridgeResponseHandler;
      if (responseHandler) {
        responseHandler({ event: 'test', payload: { data: 1 }, timestamp: Date.now() });
      }
      expect(handler).not.toHaveBeenCalled();
    });

    it('should remove all handlers when off() called without handler', () => {
      bridge = new BridgeManager({ fallback: true });
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      bridge.on('test', handler1);
      bridge.on('test', handler2);
      bridge.off('test');

      const responseHandler = (window as any).__tsBridgeResponseHandler;
      if (responseHandler) {
        responseHandler({ event: 'test', payload: {}, timestamp: Date.now() });
      }
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should return working unsubscribe function from on()', () => {
      bridge = new BridgeManager({ fallback: true });
      const handler = vi.fn();
      const unsub = bridge.on('test', handler);

      expect(typeof unsub).toBe('function');
      unsub();

      const responseHandler = (window as any).__tsBridgeResponseHandler;
      if (responseHandler) {
        responseHandler({ event: 'test', payload: {}, timestamp: Date.now() });
      }
      expect(handler).not.toHaveBeenCalled();
    });
  });
});

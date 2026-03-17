import { describe, it, expect, afterEach, vi } from 'vitest';
import { BridgeManager } from './BridgeManager';

describe('BridgeManager - Cleanup', () => {
  let bridge: BridgeManager;

  afterEach(() => {
    bridge?.dispose();
  });

  describe('destroy()', () => {
    it('should preserve middleware after destroy', () => {
      bridge = new BridgeManager({ fallback: true });
      const mw = { name: 'test', fn: async (_ctx: any, next: any) => next() };
      bridge.use(mw);
      bridge.destroy();

      // Middleware survives destroy — accessible via the private pipeline
      expect(bridge['middleware'].getAll()).toHaveLength(1);
      expect(bridge['middleware'].getAll()[0].name).toBe('test');
    });

    it('should preserve event handlers after destroy', () => {
      bridge = new BridgeManager({ fallback: true });
      const handler = vi.fn();
      bridge.on('testEvent', handler);
      bridge.destroy();

      expect(bridge['eventHandlers'].size).toBe(1);
    });

    it('should preserve action interceptors after destroy', () => {
      bridge = new BridgeManager({ fallback: true });
      bridge.registerInterceptors({
        'camera.takePhoto': [{ name: 'auth', fn: async (_ctx: any, next: any) => next() }],
      });
      bridge.destroy();

      expect(bridge['actionInterceptors'].size).toBe(1);
    });

    it('should preserve action timeouts after destroy', () => {
      bridge = new BridgeManager({ fallback: true });
      bridge.registerTimeouts({ 'camera.getInfo': 5000 });
      bridge.destroy();

      expect(bridge['actionTimeouts'].size).toBe(1);
    });

    it('should clear pending contexts after destroy', () => {
      bridge = new BridgeManager({ fallback: true });
      bridge['pendingContexts'].set('test-id', {} as any);
      bridge.destroy();

      expect(bridge['pendingContexts'].size).toBe(0);
    });

    it('should be idempotent', () => {
      bridge = new BridgeManager({ fallback: true });
      bridge.destroy();
      expect(() => bridge.destroy()).not.toThrow();
    });
  });

  describe('dispose()', () => {
    it('should clear middleware after dispose', () => {
      bridge = new BridgeManager({ fallback: true });
      bridge.use({ name: 'test', fn: async (_ctx: any, next: any) => next() });
      bridge.dispose();

      expect(bridge['middleware'].getAll()).toHaveLength(0);
    });

    it('should clear event handlers after dispose', () => {
      bridge = new BridgeManager({ fallback: true });
      bridge.on('testEvent', vi.fn());
      bridge.dispose();

      expect(bridge['eventHandlers'].size).toBe(0);
    });

    it('should clear action interceptors after dispose', () => {
      bridge = new BridgeManager({ fallback: true });
      bridge.registerInterceptors({
        'camera.takePhoto': [{ name: 'auth', fn: async (_ctx: any, next: any) => next() }],
      });
      bridge.dispose();

      expect(bridge['actionInterceptors'].size).toBe(0);
    });

    it('should clear action timeouts after dispose', () => {
      bridge = new BridgeManager({ fallback: true });
      bridge.registerTimeouts({ 'camera.getInfo': 5000 });
      bridge.dispose();

      expect(bridge['actionTimeouts'].size).toBe(0);
    });

    it('should be idempotent', () => {
      bridge = new BridgeManager({ fallback: true });
      bridge.dispose();
      expect(() => bridge.dispose()).not.toThrow();
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

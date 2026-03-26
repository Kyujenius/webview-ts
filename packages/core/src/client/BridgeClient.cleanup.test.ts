import { afterEach, describe, expect, it, vi } from 'vitest';

import { BridgeClient } from './BridgeClient';

describe('BridgeClient - Cleanup', () => {
  let bridge: BridgeClient;

  afterEach(() => {
    bridge?.dispose();
  });

  describe('destroy()', () => {
    it('should preserve request interceptors after destroy', () => {
      bridge = new BridgeClient({ fallback: true });
      bridge.interceptors.request.use({ name: 'test', fn: (req) => req });
      bridge.destroy();

      expect(bridge.interceptors.request.getAll()).toHaveLength(1);
      expect(bridge.interceptors.request.getAll()[0].name).toBe('test');
    });

    it('should preserve event handlers after destroy', () => {
      bridge = new BridgeClient({ fallback: true });
      const handler = vi.fn();
      bridge.on('testEvent', handler);
      bridge.destroy();

      expect(bridge['eventHandlers'].size).toBe(1);
    });

    it('should preserve action request interceptors after destroy', () => {
      bridge = new BridgeClient({ fallback: true });
      bridge['actionRequestInterceptors'].set('camera.takePhoto', [
        { name: 'auth', fn: async (req) => req },
      ]);
      bridge.destroy();

      expect(bridge['actionRequestInterceptors'].size).toBe(1);
    });

    it('should preserve action timeouts after destroy', () => {
      bridge = new BridgeClient({ fallback: true });
      bridge['registerTimeouts']({ 'camera.getInfo': 5000 });
      bridge.destroy();

      expect(bridge['actionTimeouts'].size).toBe(1);
    });

    it('should clear pending callbacks after destroy', () => {
      bridge = new BridgeClient({ fallback: true });
      bridge['callbacks']['callbacks'].set('test-id', {
        resolve: () => {},
        reject: () => {},
        timestamp: Date.now(),
      });
      bridge.destroy();

      expect(bridge['callbacks']['callbacks'].size).toBe(0);
    });

    it('should be idempotent', () => {
      bridge = new BridgeClient({ fallback: true });
      bridge.destroy();
      expect(() => bridge.destroy()).not.toThrow();
    });
  });

  describe('dispose()', () => {
    it('should clear request interceptors after dispose', () => {
      bridge = new BridgeClient({ fallback: true });
      bridge.interceptors.request.use({ name: 'test', fn: (req) => req });
      bridge.dispose();

      expect(bridge.interceptors.request.getAll()).toHaveLength(0);
    });

    it('should clear event handlers after dispose', () => {
      bridge = new BridgeClient({ fallback: true });
      bridge.on('testEvent', vi.fn());
      bridge.dispose();

      expect(bridge['eventHandlers'].size).toBe(0);
    });

    it('should clear action request interceptors after dispose', () => {
      bridge = new BridgeClient({ fallback: true });
      bridge['actionRequestInterceptors'].set('camera.takePhoto', [
        { name: 'auth', fn: async (req) => req },
      ]);
      bridge.dispose();

      expect(bridge['actionRequestInterceptors'].size).toBe(0);
    });

    it('should clear action timeouts after dispose', () => {
      bridge = new BridgeClient({ fallback: true });
      bridge['registerTimeouts']({ 'camera.getInfo': 5000 });
      bridge.dispose();

      expect(bridge['actionTimeouts'].size).toBe(0);
    });

    it('should be idempotent', () => {
      bridge = new BridgeClient({ fallback: true });
      bridge.dispose();
      expect(() => bridge.dispose()).not.toThrow();
    });
  });

  describe('event handler lifecycle', () => {
    it('should not call handler after off()', () => {
      bridge = new BridgeClient({ fallback: true });
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
      bridge = new BridgeClient({ fallback: true });
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
      bridge = new BridgeClient({ fallback: true });
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

import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { BridgeClient } from './BridgeClient';

describe('BridgeClient - Cleanup', () => {
  let bridge: BridgeClient;

  afterEach(() => {
    bridge?.destroy();
  });

  describe('destroy()', () => {
    it('should preserve request interceptors after destroy', async () => {
      bridge = new BridgeClient({ fallback: true });
      const seen = vi.fn();
      bridge.interceptors.request.use({
        name: 'test',
        fn: (req) => {
          seen();
          return req;
        },
      });
      bridge.destroy();

      // Interceptor registered before destroy still runs — configuration preserved
      await bridge.interceptors.request.execute({} as never);
      expect(seen).toHaveBeenCalledOnce();
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

      unsub();

      const responseHandler = (window as any).__tsBridgeResponseHandler;
      if (responseHandler) {
        responseHandler({ event: 'test', payload: {}, timestamp: Date.now() });
      }
      expect(handler).not.toHaveBeenCalled();
    });
  });
});

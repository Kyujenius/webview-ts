import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BridgeHost } from './BridgeHost';
import type { BridgeMessage } from '@webview-ts/shared';
import type { HostAdapter } from '@webview-ts/shared';

function createMockAdapter() {
  const listeners = new Set<(json: string) => void>();
  const sent: string[] = [];
  const adapter: HostAdapter = {
    send: (msg: string) => {
      sent.push(msg);
    },
    onMessage: (cb: (json: string) => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    destroy: () => {
      listeners.clear();
    },
  };
  return {
    adapter,
    sent,
    injectMessage: (json: string) => {
      for (const l of listeners) l(json);
    },
  };
}

describe('BridgeHost', () => {
  let bridgeHost: BridgeHost;
  let mockAdapter: ReturnType<typeof createMockAdapter>;

  beforeEach(() => {
    bridgeHost = new BridgeHost();

    mockAdapter = createMockAdapter();
    bridgeHost.attach(mockAdapter.adapter);
  });

  describe('initialization', () => {
    it('should create bridge host with default config', () => {
      const defaultHost = new BridgeHost();
      const config = defaultHost.getConfig();

      expect(config.timeout).toBe(0);
      expect(typeof config.onError).toBe('function');
    });

    it('should create bridge host with custom config', () => {
      const customHost = new BridgeHost({
        timeout: 10000,
      });

      const config = customHost.getConfig();
      expect(config.timeout).toBe(10000);
    });
  });

  describe('action registration', () => {
    it('should register action handler', () => {
      const handler = vi.fn();
      expect(() => {
        bridgeHost.registerAction('testAction', handler);
      }).not.toThrow();
    });

    it('should throw when registering duplicate action', () => {
      const handler = vi.fn();
      bridgeHost.registerAction('testAction', handler);

      expect(() => {
        bridgeHost.registerAction('testAction', handler);
      }).toThrow("Action 'testAction' is already registered");
    });

    it('should unregister action handler', () => {
      const handler = vi.fn();
      bridgeHost.registerAction('testAction', handler);
      bridgeHost.unregisterAction('testAction');

      // Should be able to register again after unregistering
      expect(() => {
        bridgeHost.registerAction('testAction', handler);
      }).not.toThrow();
    });
  });

  describe('message handling', () => {
    it('should handle valid message and send response', async () => {
      const handler = vi.fn().mockResolvedValue({ result: 'success' });
      bridgeHost.registerAction('testAction', handler);

      const message: BridgeMessage = {
        id: 'msg-1',
        sourceId: 'client-1',
        targetId: 'host',
        action: 'testAction',
        payload: { test: 'data' },
        timestamp: Date.now(),
      };

      await bridgeHost.handleMessageString(JSON.stringify(message));

      expect(handler).toHaveBeenCalledWith(
        { test: 'data' },
        expect.objectContaining({
          messageId: 'msg-1',
          metadata: {},
        })
      );

      expect(mockAdapter.sent.some((s) => s.includes('"success":true'))).toBe(true);
    });

    it('should send error response for unregistered action', async () => {
      const message: BridgeMessage = {
        id: 'msg-1',
        sourceId: 'client-1',
        targetId: 'host',
        action: 'unknownAction',
        timestamp: Date.now(),
      };

      await bridgeHost.handleMessageString(JSON.stringify(message));

      expect(mockAdapter.sent.some((s) => s.includes('"success":false'))).toBe(true);
    });

    it('should send error response when handler throws', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
      bridgeHost.registerAction('testAction', handler);

      const message: BridgeMessage = {
        id: 'msg-1',
        sourceId: 'client-1',
        targetId: 'host',
        action: 'testAction',
        timestamp: Date.now(),
      };

      await bridgeHost.handleMessageString(JSON.stringify(message));

      expect(mockAdapter.sent.some((s) => s.includes('"success":false'))).toBe(true);
      expect(mockAdapter.sent.some((s) => s.includes('Handler error'))).toBe(true);
    });
  });

  describe('event emission', () => {
    it('should emit events to WebView', () => {
      bridgeHost.emit('testEvent', { data: 'test' });

      expect(mockAdapter.sent.some((s) => s.includes('"event":"testEvent"'))).toBe(true);
      expect(mockAdapter.sent.some((s) => s.includes('"data":"test"'))).toBe(true);
    });

    it('should emit events without payload', () => {
      bridgeHost.emit('testEvent');

      expect(mockAdapter.sent.some((s) => s.includes('"event":"testEvent"'))).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should clean up resources', () => {
      const handler = vi.fn();
      bridgeHost.registerAction('testAction', handler);

      bridgeHost.destroy();

      // After destroy, should be able to register same action again
      expect(() => {
        bridgeHost.registerAction('testAction', handler);
      }).not.toThrow();
    });
  });
});

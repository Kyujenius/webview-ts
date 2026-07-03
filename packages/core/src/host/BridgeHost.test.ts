import type { BridgeMessage } from '@webview-ts/shared';
import type { HostAdapter } from '@webview-ts/shared';
import { ConnectionRegistry, TARGET } from '@webview-ts/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BridgeHost } from './BridgeHost';

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

  describe('action registration', () => {
    it('should throw when registering duplicate action', () => {
      const handler = vi.fn();
      bridgeHost.registerHandler('testAction', handler);

      expect(() => {
        bridgeHost.registerHandler('testAction', handler);
      }).toThrow("Action 'testAction' is already registered");
    });
  });

  describe('message handling', () => {
    it('should handle valid message and send response', async () => {
      const handler = vi.fn().mockResolvedValue({ result: 'success' });
      bridgeHost.registerHandler('testAction', handler);

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
      bridgeHost.registerHandler('testAction', handler);

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
    it('should detach adapter but preserve handlers', () => {
      const handler = vi.fn();
      bridgeHost.registerHandler('testAction', handler);

      bridgeHost.destroy();

      // Handlers preserved — re-registering same action should throw
      expect(() => {
        bridgeHost.registerHandler('testAction', handler);
      }).toThrow("Action 'testAction' is already registered");
    });
  });

  describe('onCall lifecycle events', () => {
    const message: BridgeMessage = {
      id: 'msg-1',
      sourceId: 'client-1',
      targetId: 'host',
      action: 'testAction',
      payload: { x: 1 },
      timestamp: Date.now(),
    };

    it('emits call:start and call:end around a successful handler', async () => {
      bridgeHost.registerHandler('testAction', async () => ({ ok: true }));
      const started = vi.fn();
      const ended = vi.fn();
      bridgeHost.onCall('call:start', started);
      bridgeHost.onCall('call:end', ended);

      await bridgeHost.handleMessage(message);

      expect(started).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'msg-1', action: 'testAction', payload: { x: 1 } })
      );
      expect(ended).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'msg-1',
          action: 'testAction',
          response: expect.objectContaining({ success: true }),
        })
      );
    });

    it('emits call:error when the handler throws', async () => {
      bridgeHost.registerHandler('testAction', async () => {
        throw new Error('boom');
      });
      const errored = vi.fn();
      const ended = vi.fn();
      bridgeHost.onCall('call:error', errored);
      bridgeHost.onCall('call:end', ended);

      await bridgeHost.handleMessage(message);

      expect(errored).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'msg-1', action: 'testAction', error: expect.any(Error) })
      );
      expect(ended).not.toHaveBeenCalled();
    });

    it('onCall returns a working unsubscribe function', async () => {
      bridgeHost.registerHandler('testAction', async () => ({ ok: true }));
      const started = vi.fn();
      const unsub = bridgeHost.onCall('call:start', started);
      unsub();

      await bridgeHost.handleMessage(message);
      expect(started).not.toHaveBeenCalled();
    });
  });

  describe('event sending', () => {
    it('sendEvent sends event JSON via adapter', () => {
      bridgeHost.sendEvent('test.event', { data: 1 });

      expect(mockAdapter.sent.length).toBeGreaterThan(0);
      const parsed = JSON.parse(mockAdapter.sent[mockAdapter.sent.length - 1]);
      expect(parsed.event).toBe('test.event');
      expect(parsed.payload).toEqual({ data: 1 });
      expect(parsed.sourceId).toBe('host');
    });
  });

  describe('event routing with ConnectionRegistry', () => {
    it('sendEvent with target routes to specific WebView via registry', () => {
      const registry = new ConnectionRegistry();
      const sentA: string[] = [];
      const sentB: string[] = [];
      registry.register('webview-a', (msg: string) => sentA.push(msg));
      registry.register('webview-b', (msg: string) => sentB.push(msg));

      const host = new BridgeHost({ registry });
      host.attach(mockAdapter.adapter);
      host.sendEvent('chat.message', { text: 'hi' }, { target: 'webview-a' });

      expect(sentA).toHaveLength(1);
      expect(sentB).toHaveLength(0);
      const parsed = JSON.parse(sentA[0]);
      expect(parsed.event).toBe('chat.message');
      expect(parsed.payload).toEqual({ text: 'hi' });
    });

    it('sendEvent with broadcast routes to all WebViews via registry', () => {
      const registry = new ConnectionRegistry();
      const sentA: string[] = [];
      const sentB: string[] = [];
      registry.register('webview-a', (msg: string) => sentA.push(msg));
      registry.register('webview-b', (msg: string) => sentB.push(msg));

      const host = new BridgeHost({ registry });
      host.attach(mockAdapter.adapter);
      host.sendEvent('auth.expired', { reason: 'timeout' }, { target: TARGET.BROADCAST });

      expect(sentA).toHaveLength(1);
      expect(sentB).toHaveLength(1);
      expect(JSON.parse(sentA[0]).event).toBe('auth.expired');
      expect(JSON.parse(sentB[0]).event).toBe('auth.expired');
    });

    it('sendEvent without target falls back to attached adapter', () => {
      const registry = new ConnectionRegistry();
      const host = new BridgeHost({ registry });
      host.attach(mockAdapter.adapter);

      host.sendEvent('local.event', { x: 1 });

      expect(mockAdapter.sent).toHaveLength(1);
      expect(JSON.parse(mockAdapter.sent[0]).event).toBe('local.event');
    });

    it('response routes to correct WebView via registry', async () => {
      const registry = new ConnectionRegistry();
      const sentToA: string[] = [];
      registry.register('webview-a', (msg: string) => sentToA.push(msg));

      const host = new BridgeHost({ registry });
      host.attach(mockAdapter.adapter);
      host.registerHandler('test.action', async () => 'ok');

      const message = {
        id: 'msg-1',
        action: 'test.action',
        payload: undefined,
        timestamp: Date.now(),
        sourceId: 'webview-a',
        targetId: 'host',
      };
      await host.handleMessageString(JSON.stringify(message));

      // Response should be routed to webview-a via registry, not via adapter
      expect(sentToA).toHaveLength(1);
      expect(mockAdapter.sent).toHaveLength(0);
      const parsed = JSON.parse(sentToA[0]);
      expect(parsed.id).toBe('msg-1');
      expect(parsed.success).toBe(true);
      expect(parsed.targetId).toBe('webview-a');
    });
  });
});

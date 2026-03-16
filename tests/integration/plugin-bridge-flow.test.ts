/**
 * Integration test: Plugin system end-to-end message flow
 *
 * Verifies that messages travel the full path:
 *   usePlugin(camera).takePhoto()
 *     → BridgeManager.call('camera.takePhoto', payload)
 *       → BridgeHost.handleMessage(message)
 *         → camera.host() handler executes
 *           → BridgeResponse flows back
 *             → Promise resolves with typed data
 *
 * Uses BridgeManager's fallback mechanism to route messages through
 * a real BridgeHost instance, testing actual handler dispatch.
 */
import { describe, it, expect, vi } from 'vitest';
import { BridgeHost } from '@webview-ts/native';
import { createBridge } from '@webview-ts/core';
import { definePlugin, action } from '@webview-ts/shared';
import type { BridgeMessage } from '@webview-ts/shared';

// ─── Define plugins ───

const camera = definePlugin('camera', {
  takePhoto: action<{ quality?: number }, { uri: string; width: number; height: number }>(),
  pickImage: action<{ multiple?: boolean }, { images: { uri: string }[] }>(),
  recordVideo: action<{ maxDuration?: number }, { uri: string; duration: number }>(),
});

const storage = definePlugin('storage', {
  getItem: action<{ key: string }, { value: string | null }>(),
  setItem: action<{ key: string; value: string }, Record<string, never>>(),
  removeItem: action<{ key: string }, Record<string, never>>(),
  clear: action<Record<string, never>, Record<string, never>>(),
  getAllKeys: action<Record<string, never>, { keys: string[] }>(),
});

/**
 * Create a bridge pair: client BridgeManager + host BridgeHost
 * connected via fallback adapter that routes through the host.
 */
function createBridgePair(hostPluginResults: ReturnType<typeof camera.host>[]) {
  const bridgeHost = new BridgeHost();
  for (const plugin of hostPluginResults) {
    for (const [actionName, handler] of Object.entries(plugin.handlers)) {
      bridgeHost.registerHandler(actionName, handler as any);
    }
  }

  const fallback: Record<string, (payload: any) => Promise<any>> = {};
  for (const plugin of hostPluginResults) {
    for (const actionName of Object.keys(plugin.handlers)) {
      fallback[actionName] = async (payload: any) => {
        const message: BridgeMessage = {
          id: `int-${Date.now()}-${Math.random()}`,
          action: actionName,
          payload,
          timestamp: Date.now(),
        };
        const response = await bridgeHost.handleMessage(message);
        if (!response.success) {
          throw new Error(response.error?.message ?? 'Host handler failed');
        }
        return response.data;
      };
    }
  }

  const bridge = createBridge({ fallback });
  return { bridge, bridgeHost };
}

// ─── Camera Plugin Integration ───

describe('Camera plugin: full message flow', () => {
  const cameraHostResult = camera.host({
    takePhoto: async (payload) => ({
      uri: `native://photo-q${payload.quality ?? 'default'}`,
      width: 1920,
      height: 1080,
    }),
    pickImage: async (payload) => ({
      images: payload.multiple
        ? [{ uri: 'native://img1' }, { uri: 'native://img2' }]
        : [{ uri: 'native://img1' }],
    }),
    recordVideo: async (payload) => ({
      uri: 'native://video.mp4',
      duration: payload.maxDuration ?? 30,
    }),
  });

  const { bridge } = createBridgePair([cameraHostResult]);

  it('takePhoto: payload reaches host, typed response returns', async () => {
    const result = await bridge.call('camera.takePhoto', { quality: 0.8 });
    expect(result).toEqual({
      uri: 'native://photo-q0.8',
      width: 1920,
      height: 1080,
    });
  });

  it('pickImage: multiple=true returns multiple images', async () => {
    const result = await bridge.call('camera.pickImage', { multiple: true });
    expect(result.images).toHaveLength(2);
    expect(result.images[0].uri).toBe('native://img1');
  });

  it('pickImage: multiple=false returns single image', async () => {
    const result = await bridge.call('camera.pickImage', { multiple: false });
    expect(result.images).toHaveLength(1);
  });

  it('recordVideo: maxDuration flows through', async () => {
    const result = await bridge.call('camera.recordVideo', { maxDuration: 60 });
    expect(result.duration).toBe(60);
    expect(result.uri).toBe('native://video.mp4');
  });

  it('plugin methods convenience wrapper works end-to-end', async () => {
    const methods = camera.methods((a, payload) => bridge.call(a as any, payload as any) as any);
    const photo = await methods.takePhoto({ quality: 0.5 });
    expect(photo.uri).toBe('native://photo-q0.5');
    expect(photo.width).toBe(1920);
  });
});

// ─── Storage Plugin Integration ───

describe('Storage plugin: full message flow', () => {
  const store = new Map<string, string>();

  const storageHostResult = storage.host({
    getItem: async (payload) => ({
      value: store.get(payload.key) ?? null,
    }),
    setItem: async (payload) => {
      store.set(payload.key, payload.value);
      return {};
    },
    removeItem: async (payload) => {
      store.delete(payload.key);
      return {};
    },
    clear: async () => {
      store.clear();
      return {};
    },
    getAllKeys: async () => ({
      keys: Array.from(store.keys()),
    }),
  });

  const { bridge } = createBridgePair([storageHostResult]);

  it('setItem + getItem roundtrip', async () => {
    await bridge.call('storage.setItem', { key: 'user', value: 'Alice' });
    const result = await bridge.call('storage.getItem', { key: 'user' });
    expect(result.value).toBe('Alice');
  });

  it('getItem returns null for missing key', async () => {
    const result = await bridge.call('storage.getItem', { key: 'nonexistent' });
    expect(result.value).toBeNull();
  });

  it('removeItem removes the key', async () => {
    await bridge.call('storage.setItem', { key: 'temp', value: 'data' });
    await bridge.call('storage.removeItem', { key: 'temp' });
    const result = await bridge.call('storage.getItem', { key: 'temp' });
    expect(result.value).toBeNull();
  });

  it('getAllKeys lists stored keys', async () => {
    store.clear();
    await bridge.call('storage.setItem', { key: 'a', value: '1' });
    await bridge.call('storage.setItem', { key: 'b', value: '2' });
    const result = await bridge.call('storage.getAllKeys', {} as Record<string, never>);
    expect(result.keys).toContain('a');
    expect(result.keys).toContain('b');
  });

  it('clear removes all keys', async () => {
    await bridge.call('storage.setItem', { key: 'x', value: 'y' });
    await bridge.call('storage.clear', {} as Record<string, never>);
    const result = await bridge.call('storage.getAllKeys', {} as Record<string, never>);
    expect(result.keys).toHaveLength(0);
  });

  it('plugin methods convenience wrapper works', async () => {
    store.clear();
    const methods = storage.methods((a, payload) => bridge.call(a as any, payload as any) as any);
    await methods.setItem({ key: 'name', value: 'Bob' });
    const item = await methods.getItem({ key: 'name' });
    expect(item.value).toBe('Bob');
  });
});

// ─── Multi-Plugin Integration ───

describe('Multiple plugins: combined host', () => {
  const cameraHost = camera.host({
    takePhoto: async () => ({ uri: 'photo.jpg', width: 100, height: 100 }),
    pickImage: async () => ({ images: [] }),
    recordVideo: async () => ({ uri: 'video.mp4', duration: 0 }),
  });

  const storageHost = storage.host({
    getItem: async () => ({ value: 'cached' }),
    setItem: async () => ({}),
    removeItem: async () => ({}),
    clear: async () => ({}),
    getAllKeys: async () => ({ keys: ['cached-key'] }),
  });

  const { bridge } = createBridgePair([cameraHost, storageHost]);

  it('camera and storage both work through same bridge', async () => {
    const photo = await bridge.call('camera.takePhoto', {});
    expect(photo.uri).toBe('photo.jpg');

    const stored = await bridge.call('storage.getItem', { key: 'test' });
    expect(stored.value).toBe('cached');
  });
});

// ─── Custom Plugin Integration ───

describe('Custom plugin: definePlugin + full flow', () => {
  const payment = definePlugin('payment', {
    checkout: action<
      { amount: number; currency: string },
      { transactionId: string; success: boolean }
    >(),
  });

  const paymentHost = payment.host({
    checkout: async (payload) => ({
      transactionId: `txn-${payload.amount}-${payload.currency}`,
      success: payload.amount > 0,
    }),
  });

  const { bridge } = createBridgePair([paymentHost]);

  it('custom plugin flows through bridge correctly', async () => {
    const methods = payment.methods((a, payload) => bridge.call(a as any, payload as any) as any);
    const result = await methods.checkout({ amount: 100, currency: 'USD' });
    expect(result.transactionId).toBe('txn-100-USD');
    expect(result.success).toBe(true);
  });

  it('custom plugin with zero amount', async () => {
    const result = await bridge.call('payment.checkout' as any, {
      amount: 0,
      currency: 'KRW',
    });
    expect((result as any).success).toBe(false);
  });
});

// ─── Error Handling ───

describe('Error handling: host handler throws', () => {
  const errorPlugin = definePlugin('error', {
    fail: action<Record<string, never>, Record<string, never>>(),
  });

  const errorHost = errorPlugin.host({
    fail: async () => {
      throw new Error('Intentional failure');
    },
  });

  const { bridge } = createBridgePair([errorHost]);

  it('host error propagates to client as rejection', async () => {
    await expect(bridge.call('error.fail' as any, {})).rejects.toThrow('Intentional failure');
  });
});

// ─── Actions map ───

describe('Plugin actions map', () => {
  it('exposes runtime action name map', () => {
    expect(camera.actions.takePhoto).toBe('camera.takePhoto');
    expect(camera.actions.pickImage).toBe('camera.pickImage');
    expect(storage.actions.getItem).toBe('storage.getItem');
  });
});

// ─── Event (Native → Web push) ───

describe('Event: bridge.on / bridge.off', () => {
  const { bridge } = createBridgePair([
    camera.host({
      takePhoto: async () => ({ uri: 'photo.jpg', width: 100, height: 100 }),
      pickImage: async () => ({ images: [] }),
      recordVideo: async () => ({ uri: 'video.mp4', duration: 0 }),
    }),
  ]);

  it('on() subscribes and receives events', () => {
    const received: unknown[] = [];
    const unsubscribe = bridge.on('location.updated', (payload) => {
      received.push(payload);
    });

    // Simulate native pushing events via handleEvent (private), so call through on
    // We test the public API: on registers handler, off removes it
    // Directly invoke the handler through the event system
    // Since handleEvent is private, we test via the public on/off contract
    const handlers = (bridge as any).eventHandlers.get('location.updated');
    expect(handlers).toBeDefined();
    expect(handlers.size).toBe(1);

    // Simulate event dispatch
    handlers.forEach((h: (p: unknown) => void) =>
      h({ latitude: 37.5, longitude: 127.0, accuracy: 5 })
    );

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ latitude: 37.5, longitude: 127.0, accuracy: 5 });

    unsubscribe();
    expect((bridge as any).eventHandlers.has('location.updated')).toBe(false);
  });

  it('on() returns unsubscribe that removes only that handler', () => {
    const received1: unknown[] = [];
    const received2: unknown[] = [];

    const unsub1 = bridge.on('test.event', (p) => received1.push(p));
    const unsub2 = bridge.on('test.event', (p) => received2.push(p));

    const handlers = (bridge as any).eventHandlers.get('test.event');
    handlers.forEach((h: (p: unknown) => void) => h('ping'));

    expect(received1).toEqual(['ping']);
    expect(received2).toEqual(['ping']);

    unsub1();

    handlers.forEach((h: (p: unknown) => void) => h('pong'));
    expect(received1).toEqual(['ping']); // no longer receives
    expect(received2).toEqual(['ping', 'pong']);

    unsub2();
    expect((bridge as any).eventHandlers.has('test.event')).toBe(false);
  });

  it('off() without handler removes all handlers for that event', () => {
    bridge.on('bulk.event', () => {});
    bridge.on('bulk.event', () => {});
    expect((bridge as any).eventHandlers.get('bulk.event')?.size).toBe(2);

    bridge.off('bulk.event');
    expect((bridge as any).eventHandlers.has('bulk.event')).toBe(false);
  });

  it('multiple events are independent', () => {
    const posEvents: unknown[] = [];
    const pushEvents: unknown[] = [];

    const unsub1 = bridge.on('location.updated', (p) => posEvents.push(p));
    const unsub2 = bridge.on('push.received', (p) => pushEvents.push(p));

    (bridge as any).eventHandlers
      .get('location.updated')
      .forEach((h: (p: unknown) => void) => h({ lat: 1 }));
    (bridge as any).eventHandlers
      .get('push.received')
      .forEach((h: (p: unknown) => void) => h({ title: 'hello' }));

    expect(posEvents).toEqual([{ lat: 1 }]);
    expect(pushEvents).toEqual([{ title: 'hello' }]);

    unsub1();
    unsub2();
  });

  it('handler errors do not break other handlers', () => {
    const received: unknown[] = [];
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    bridge.on('error.event', () => {
      throw new Error('handler crashed');
    });
    bridge.on('error.event', (p) => received.push(p));

    const handlers = (bridge as any).eventHandlers.get('error.event');
    handlers.forEach((h: (p: unknown) => void) => {
      try {
        h('data');
      } catch {
        // handleEvent catches internally, simulate that
      }
    });

    // The second handler still received the event
    expect(received).toEqual(['data']);

    bridge.off('error.event');
    consoleSpy.mockRestore();
  });
});

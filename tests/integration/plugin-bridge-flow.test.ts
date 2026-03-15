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
import { describe, it, expect } from 'vitest';
import { BridgeHost } from '@webview-ts/native';
import { createBridge } from '@webview-ts/core';
import { definePlugin } from '@webview-ts/shared';
import type { BridgeMessage } from '@webview-ts/shared';

// ─── Define plugins inline ───

type CameraActions = {
  'camera.takePhoto': {
    payload: { quality?: number };
    response: { uri: string; width: number; height: number };
  };
  'camera.pickImage': {
    payload: { multiple?: boolean };
    response: { images: { uri: string }[] };
  };
  'camera.recordVideo': {
    payload: { maxDuration?: number };
    response: { uri: string; duration: number };
  };
};

const camera = definePlugin<CameraActions>()({
  name: 'camera',
  methods: (call) => ({
    takePhoto: (opts: { quality?: number }) => call('camera.takePhoto', opts),
    pickImage: (opts: { multiple?: boolean }) => call('camera.pickImage', opts),
    recordVideo: (opts: { maxDuration?: number }) => call('camera.recordVideo', opts),
  }),
});

type StorageActions = {
  'storage.getItem': { payload: { key: string }; response: { value: string | null } };
  'storage.setItem': { payload: { key: string; value: string }; response: Record<string, never> };
  'storage.removeItem': { payload: { key: string }; response: Record<string, never> };
  'storage.clear': { payload: Record<string, never>; response: Record<string, never> };
  'storage.getAllKeys': { payload: Record<string, never>; response: { keys: string[] } };
};

const storage = definePlugin<StorageActions>()({
  name: 'storage',
  methods: (call) => ({
    getItem: (key: string) => call('storage.getItem', { key }),
    setItem: (key: string, value: string) => call('storage.setItem', { key, value }),
    removeItem: (key: string) => call('storage.removeItem', { key }),
    clear: () => call('storage.clear', {} as Record<string, never>),
    getAllKeys: () => call('storage.getAllKeys', {} as Record<string, never>),
  }),
});

/**
 * Create a bridge pair: client BridgeManager + host BridgeHost
 * connected via fallback adapter that routes through the host.
 */
function createBridgePair(hostPluginResults: ReturnType<typeof camera.host>[]) {
  const bridgeHost = new BridgeHost();
  for (const plugin of hostPluginResults) {
    for (const [action, handler] of Object.entries(plugin.handlers)) {
      bridgeHost.registerHandler(action, handler as any);
    }
  }

  const fallback: Record<string, (payload: any) => Promise<any>> = {};
  for (const plugin of hostPluginResults) {
    for (const action of Object.keys(plugin.handlers)) {
      fallback[action] = async (payload: any) => {
        const message: BridgeMessage = {
          id: `int-${Date.now()}-${Math.random()}`,
          action,
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

  const bridge = createBridge({ timeout: 5000, fallback });
  return { bridge, bridgeHost };
}

// ─── Camera Plugin Integration ───

describe('Camera plugin: full message flow', () => {
  const cameraHostResult = camera.host({
    'camera.takePhoto': async (payload) => ({
      uri: `native://photo-q${payload.quality ?? 'default'}`,
      width: 1920,
      height: 1080,
    }),
    'camera.pickImage': async (payload) => ({
      images: payload.multiple
        ? [{ uri: 'native://img1' }, { uri: 'native://img2' }]
        : [{ uri: 'native://img1' }],
    }),
    'camera.recordVideo': async (payload) => ({
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
    const methods = camera.methods(
      (action, payload) => bridge.call(action as any, payload as any) as any
    );
    const photo = await methods.takePhoto({ quality: 0.5 });
    expect(photo.uri).toBe('native://photo-q0.5');
    expect(photo.width).toBe(1920);
  });
});

// ─── Storage Plugin Integration ───

describe('Storage plugin: full message flow', () => {
  const store = new Map<string, string>();

  const storageHostResult = storage.host({
    'storage.getItem': async (payload) => ({
      value: store.get(payload.key) ?? null,
    }),
    'storage.setItem': async (payload) => {
      store.set(payload.key, payload.value);
      return {};
    },
    'storage.removeItem': async (payload) => {
      store.delete(payload.key);
      return {};
    },
    'storage.clear': async () => {
      store.clear();
      return {};
    },
    'storage.getAllKeys': async () => ({
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
    const methods = storage.methods(
      (action, payload) => bridge.call(action as any, payload as any) as any
    );
    await methods.setItem('name', 'Bob');
    const item = await methods.getItem('name');
    expect(item.value).toBe('Bob');
  });
});

// ─── Multi-Plugin Integration ───

describe('Multiple plugins: combined host', () => {
  const cameraHost = camera.host({
    'camera.takePhoto': async () => ({ uri: 'photo.jpg', width: 100, height: 100 }),
    'camera.pickImage': async () => ({ images: [] }),
    'camera.recordVideo': async () => ({ uri: 'video.mp4', duration: 0 }),
  });

  const storageHost = storage.host({
    'storage.getItem': async () => ({ value: 'cached' }),
    'storage.setItem': async () => ({}),
    'storage.removeItem': async () => ({}),
    'storage.clear': async () => ({}),
    'storage.getAllKeys': async () => ({ keys: ['cached-key'] }),
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
  type PaymentActions = {
    'payment.checkout': {
      payload: { amount: number; currency: string };
      response: { transactionId: string; success: boolean };
    };
  };

  const payment = definePlugin<PaymentActions>()({
    name: 'payment',
    methods: (call) => ({
      checkout: (amount: number, currency: string) =>
        call('payment.checkout', { amount, currency }),
    }),
  });

  const paymentHost = payment.host({
    'payment.checkout': async (payload) => ({
      transactionId: `txn-${payload.amount}-${payload.currency}`,
      success: payload.amount > 0,
    }),
  });

  const { bridge } = createBridgePair([paymentHost]);

  it('custom plugin flows through bridge correctly', async () => {
    const methods = payment.methods(
      (action, payload) => bridge.call(action as any, payload as any) as any
    );
    const result = await methods.checkout(100, 'USD');
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
  type ErrorActions = {
    'error.fail': { payload: Record<string, never>; response: Record<string, never> };
  };

  const errorPlugin = definePlugin<ErrorActions>()({
    name: 'error',
  });

  const errorHost = errorPlugin.host({
    'error.fail': async () => {
      throw new Error('Intentional failure');
    },
  });

  const { bridge } = createBridgePair([errorHost]);

  it('host error propagates to client as rejection', async () => {
    await expect(bridge.call('error.fail' as any, {})).rejects.toThrow('Intentional failure');
  });
});

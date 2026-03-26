import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, inject } from 'vue';

import { BRIDGE_KEY, type BridgeContext } from '../bridgeKey';
import type { useBridge } from '../composables/useBridge';
import { createBridgeVue } from '../createBridgeVue';

// Mock BridgeClient so tests don't need a real WebView environment
vi.mock('@webview-ts/core', () => {
  const BridgeClient = vi.fn(() => {
    const instance: Record<string, any> = {
      connect: vi.fn(),
      destroy: vi.fn(),
      isAvailable: vi.fn(() => false),
      connectionMode: 'fallback' as const,
      on: vi.fn(() => vi.fn()),
      createActionState: vi.fn(),
      registerInterceptors: vi.fn(),
      registerTimeouts: vi.fn(),
      registerRetries: vi.fn(),
      registerCaches: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    };
    instance.applyPlugins = vi.fn((plugins?: any[], interceptors?: any) => {
      if (plugins) {
        for (const plugin of plugins) {
          if (plugin.interceptors && Object.keys(plugin.interceptors).length > 0) {
            instance.registerInterceptors(plugin.interceptors);
          }
          if (plugin.timeouts && Object.keys(plugin.timeouts).length > 0) {
            instance.registerTimeouts(plugin.timeouts);
          }
          if (plugin.retries && Object.keys(plugin.retries).length > 0) {
            instance.registerRetries(plugin.retries);
          }
          if (plugin.caches && Object.keys(plugin.caches).length > 0) {
            instance.registerCaches(plugin.caches);
          }
        }
      }
      if (interceptors?.request) {
        for (const interceptor of interceptors.request) {
          instance.interceptors.request.use(interceptor);
        }
      }
      if (interceptors?.response) {
        for (const interceptor of interceptors.response) {
          instance.interceptors.response.use(interceptor);
        }
      }
    });
    return instance;
  });
  return { BridgeClient };
});

type MockedBridgeClientCtor = ReturnType<typeof vi.fn>;

describe('createBridgeVue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('returned object shape', () => {
    it('exposes install, useBridge, useAction, usePlugin, useEvent', () => {
      const bridge = createBridgeVue();
      expect(typeof bridge.install).toBe('function');
      expect(typeof bridge.useBridge).toBe('function');
      expect(typeof bridge.useAction).toBe('function');
      expect(typeof bridge.usePlugin).toBe('function');
      expect(typeof bridge.useEvent).toBe('function');
    });
  });

  describe('install()', () => {
    it('provides bridge context so useBridge works after install', () => {
      const plugin = createBridgeVue();

      let captured: ReturnType<typeof useBridge> | undefined;
      const Comp = defineComponent({
        setup() {
          captured = plugin.useBridge();
          return () => h('div');
        },
      });

      mount(Comp, { global: { plugins: [plugin] } });

      expect(captured).toBeDefined();
      expect(captured!.isAvailable).toBeDefined();
      expect(captured!.connectionMode).toBeDefined();
      expect(captured!.bridge).toBeDefined();
    });

    it('provides connectionMode as fallback when native is unavailable', () => {
      const plugin = createBridgeVue();

      let capturedMode: string | undefined;
      const Comp = defineComponent({
        setup() {
          const { connectionMode } = plugin.useBridge();
          capturedMode = connectionMode.value;
          return () => h('div');
        },
      });

      mount(Comp, { global: { plugins: [plugin] } });

      expect(capturedMode).toBe('fallback');
    });

    it('provides a BridgeContext object with bridge, isAvailable, connectionMode keys', () => {
      const plugin = createBridgeVue();

      let ctx: BridgeContext | undefined;
      const Comp = defineComponent({
        setup() {
          ctx = inject(BRIDGE_KEY);
          return () => h('div');
        },
      });

      mount(Comp, { global: { plugins: [plugin] } });

      expect(ctx).toBeDefined();
      expect('bridge' in ctx!).toBe(true);
      expect('isAvailable' in ctx!).toBe(true);
      expect('connectionMode' in ctx!).toBe(true);
    });

    it('registers a $webviewBridgeCleanup on globalProperties', () => {
      const plugin = createBridgeVue();
      const app = createApp(defineComponent({ render: () => h('div') }));
      app.use(plugin);

      expect(typeof app.config.globalProperties.$webviewBridgeCleanup).toBe('function');
    });
  });

  describe('global interceptor registration', () => {
    it('calls interceptors.request.use() for each request interceptor passed in options', async () => {
      const { BridgeClient } = await import('@webview-ts/core');

      const ri1 = vi.fn();
      const ri2 = vi.fn();

      const plugin = createBridgeVue({ interceptors: { request: [ri1, ri2] } });
      mount(defineComponent({ setup: () => () => h('div') }), {
        global: { plugins: [plugin] },
      });

      const calls = (BridgeClient as unknown as MockedBridgeClientCtor).mock.results;
      const instance = calls[calls.length - 1].value;

      expect(instance.interceptors.request.use).toHaveBeenCalledTimes(2);
      expect(instance.interceptors.request.use).toHaveBeenCalledWith(ri1);
      expect(instance.interceptors.request.use).toHaveBeenCalledWith(ri2);
    });

    it('calls interceptors.response.use() for each response interceptor passed in options', async () => {
      const { BridgeClient } = await import('@webview-ts/core');

      const rsp1 = vi.fn();

      const plugin = createBridgeVue({ interceptors: { response: [rsp1] } });
      mount(defineComponent({ setup: () => () => h('div') }), {
        global: { plugins: [plugin] },
      });

      const calls = (BridgeClient as unknown as MockedBridgeClientCtor).mock.results;
      const instance = calls[calls.length - 1].value;

      expect(instance.interceptors.response.use).toHaveBeenCalledTimes(1);
      expect(instance.interceptors.response.use).toHaveBeenCalledWith(rsp1);
    });

    it('does not call interceptors.request.use() when no interceptors provided', async () => {
      const { BridgeClient } = await import('@webview-ts/core');

      const plugin = createBridgeVue();
      mount(defineComponent({ setup: () => () => h('div') }), {
        global: { plugins: [plugin] },
      });

      const calls = (BridgeClient as unknown as MockedBridgeClientCtor).mock.results;
      const instance = calls[calls.length - 1].value;

      expect(instance.interceptors.request.use).not.toHaveBeenCalled();
      expect(instance.interceptors.response.use).not.toHaveBeenCalled();
    });
  });

  describe('plugin fallback merging', () => {
    it('collects fallback from a single plugin', async () => {
      const { BridgeClient } = await import('@webview-ts/core');

      const fallbackFn = vi.fn(() => ({ ok: true }));
      const plugin = createBridgeVue({
        plugins: [{ fallback: { 'action.foo': fallbackFn } }] as any,
      });
      mount(defineComponent({ setup: () => () => h('div') }), {
        global: { plugins: [plugin] },
      });

      const calls = (BridgeClient as unknown as MockedBridgeClientCtor).mock.calls;
      const finalConfig = calls[calls.length - 1][0];
      expect(finalConfig.fallback).toMatchObject({ 'action.foo': fallbackFn });
    });

    it('merges fallbacks from multiple plugins (later plugin overrides)', async () => {
      const { BridgeClient } = await import('@webview-ts/core');

      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const plugin = createBridgeVue({
        plugins: [
          { fallback: { 'action.foo': fn1, 'action.bar': fn1 } },
          { fallback: { 'action.foo': fn2 } },
        ] as any,
      });
      mount(defineComponent({ setup: () => () => h('div') }), {
        global: { plugins: [plugin] },
      });

      const calls = (BridgeClient as unknown as MockedBridgeClientCtor).mock.calls;
      const finalConfig = calls[calls.length - 1][0];
      expect(finalConfig.fallback['action.foo']).toBe(fn2);
      expect(finalConfig.fallback['action.bar']).toBe(fn1);
    });

    it('plugin fallback is overridden by config fallback (FallbackMap form)', async () => {
      const { BridgeClient } = await import('@webview-ts/core');

      const pluginFn = vi.fn();
      const configFn = vi.fn();
      const plugin = createBridgeVue({
        plugins: [{ fallback: { 'action.foo': pluginFn } }] as any,
        config: { fallback: { 'action.foo': configFn } as any },
      });
      mount(defineComponent({ setup: () => () => h('div') }), {
        global: { plugins: [plugin] },
      });

      const calls = (BridgeClient as unknown as MockedBridgeClientCtor).mock.calls;
      const finalConfig = calls[calls.length - 1][0];
      expect(finalConfig.fallback['action.foo']).toBe(configFn);
    });

    it('plugin fallback is overridden by config fallback (FallbackMap form)', async () => {
      const { BridgeClient } = await import('@webview-ts/core');

      const pluginFn = vi.fn();
      const configFn = vi.fn();
      const plugin = createBridgeVue({
        plugins: [{ fallback: { 'action.foo': pluginFn } }] as any,
        config: { fallback: { 'action.foo': configFn } },
      });
      mount(defineComponent({ setup: () => () => h('div') }), {
        global: { plugins: [plugin] },
      });

      const calls = (BridgeClient as unknown as MockedBridgeClientCtor).mock.calls;
      const finalConfig = calls[calls.length - 1][0];
      expect(finalConfig.fallback['action.foo']).toBe(configFn);
    });

    it('uses config fallback directly when no plugin provides fallback', async () => {
      const { BridgeClient } = await import('@webview-ts/core');

      const configFn = vi.fn();
      const plugin = createBridgeVue({
        plugins: [{}] as any,
        config: { fallback: { 'action.foo': configFn } as any },
      });
      mount(defineComponent({ setup: () => () => h('div') }), {
        global: { plugins: [plugin] },
      });

      const calls = (BridgeClient as unknown as MockedBridgeClientCtor).mock.calls;
      const finalConfig = calls[calls.length - 1][0];
      expect(finalConfig.fallback['action.foo']).toBe(configFn);
    });
  });

  describe('plugin registration (interceptors, timeouts, retries, caches)', () => {
    it('calls registerInterceptors for a plugin with interceptors', async () => {
      const { BridgeClient } = await import('@webview-ts/core');

      const interceptors = { 'action.foo': [vi.fn()] };
      const plugin = createBridgeVue({
        plugins: [{ interceptors }] as any,
      });
      mount(defineComponent({ setup: () => () => h('div') }), {
        global: { plugins: [plugin] },
      });

      const results = (BridgeClient as unknown as MockedBridgeClientCtor).mock.results;
      const instance = results[results.length - 1].value;
      expect(instance.registerInterceptors).toHaveBeenCalledWith(interceptors);
    });

    it('does not call registerInterceptors when plugin.interceptors is empty', async () => {
      const { BridgeClient } = await import('@webview-ts/core');

      const plugin = createBridgeVue({
        plugins: [{ interceptors: {} }] as any,
      });
      mount(defineComponent({ setup: () => () => h('div') }), {
        global: { plugins: [plugin] },
      });

      const results = (BridgeClient as unknown as MockedBridgeClientCtor).mock.results;
      const instance = results[results.length - 1].value;
      expect(instance.registerInterceptors).not.toHaveBeenCalled();
    });

    it('calls registerTimeouts for a plugin with timeouts', async () => {
      const { BridgeClient } = await import('@webview-ts/core');

      const timeouts = { 'action.foo': 5000 };
      const plugin = createBridgeVue({
        plugins: [{ timeouts }] as any,
      });
      mount(defineComponent({ setup: () => () => h('div') }), {
        global: { plugins: [plugin] },
      });

      const results = (BridgeClient as unknown as MockedBridgeClientCtor).mock.results;
      const instance = results[results.length - 1].value;
      expect(instance.registerTimeouts).toHaveBeenCalledWith(timeouts);
    });

    it('calls registerRetries for a plugin with retries', async () => {
      const { BridgeClient } = await import('@webview-ts/core');

      const retries = { 'action.foo': 3 };
      const plugin = createBridgeVue({
        plugins: [{ retries }] as any,
      });
      mount(defineComponent({ setup: () => () => h('div') }), {
        global: { plugins: [plugin] },
      });

      const results = (BridgeClient as unknown as MockedBridgeClientCtor).mock.results;
      const instance = results[results.length - 1].value;
      expect(instance.registerRetries).toHaveBeenCalledWith(retries);
    });

    it('calls registerCaches for a plugin with caches', async () => {
      const { BridgeClient } = await import('@webview-ts/core');

      const caches = { 'action.foo': { ttl: 1000 } };
      const plugin = createBridgeVue({
        plugins: [{ caches }] as any,
      });
      mount(defineComponent({ setup: () => () => h('div') }), {
        global: { plugins: [plugin] },
      });

      const results = (BridgeClient as unknown as MockedBridgeClientCtor).mock.results;
      const instance = results[results.length - 1].value;
      expect(instance.registerCaches).toHaveBeenCalledWith(caches);
    });

    it('registers multiple plugin configs from multiple plugins', async () => {
      const { BridgeClient } = await import('@webview-ts/core');

      const timeouts1 = { 'action.foo': 3000 };
      const timeouts2 = { 'action.bar': 7000 };
      const plugin = createBridgeVue({
        plugins: [{ timeouts: timeouts1 }, { timeouts: timeouts2 }] as any,
      });
      mount(defineComponent({ setup: () => () => h('div') }), {
        global: { plugins: [plugin] },
      });

      const results = (BridgeClient as unknown as MockedBridgeClientCtor).mock.results;
      const instance = results[results.length - 1].value;
      expect(instance.registerTimeouts).toHaveBeenCalledTimes(2);
      expect(instance.registerTimeouts).toHaveBeenCalledWith(timeouts1);
      expect(instance.registerTimeouts).toHaveBeenCalledWith(timeouts2);
    });
  });

  describe('useEvent (typed)', () => {
    it('throws without a provider', () => {
      const plugin = createBridgeVue();
      const handler = vi.fn();

      const Comp = defineComponent({
        setup() {
          plugin.useEvent('some.event' as never, handler);
          return () => h('div');
        },
      });

      expect(() => mount(Comp)).toThrow(
        '[webview-ts/vue] useEvent() called without BridgeProvider'
      );
    });

    it('subscribes via bridge.on when provider is present', () => {
      const plugin = createBridgeVue();
      const handler = vi.fn();

      let bridgeInstance: BridgeContext['bridge'] | undefined;
      const Capture = defineComponent({
        setup() {
          const ctx = inject(BRIDGE_KEY);
          bridgeInstance = ctx?.bridge;
          return () => h('div');
        },
      });

      const Subscriber = defineComponent({
        setup() {
          plugin.useEvent('some.event' as never, handler);
          return () => h('div');
        },
      });

      const Parent = defineComponent({
        setup() {
          return () => h('div', [h(Capture), h(Subscriber)]);
        },
      });

      mount(Parent, { global: { plugins: [plugin] } });

      expect(bridgeInstance!.on).toHaveBeenCalledWith('some.event', handler);
    });
  });
});

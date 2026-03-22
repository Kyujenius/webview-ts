import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApp, defineComponent, h, inject } from 'vue';
import { mount } from '@vue/test-utils';
import { createBridgeVue } from '../createBridgeVue';
import { BRIDGE_KEY, type BridgeContext } from '../bridgeKey';
import { useBridge } from '../composables/useBridge';

// Mock BridgeClient so tests don't need a real WebView environment
vi.mock('@webview-ts/core', () => {
  const BridgeClient = vi.fn(() => ({
    connect: vi.fn(),
    destroy: vi.fn(),
    isAvailable: vi.fn(() => false),
    connectionMode: 'fallback' as const,
    use: vi.fn(),
    on: vi.fn(() => vi.fn()),
    createActionState: vi.fn(),
    registerInterceptors: vi.fn(),
    registerTimeouts: vi.fn(),
    registerRetries: vi.fn(),
    registerCaches: vi.fn(),
  }));
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

  describe('global middleware registration', () => {
    it('calls bridge.use() for each middleware passed in options', async () => {
      const { BridgeClient } = await import('@webview-ts/core');

      const mw1 = vi.fn((_ctx: unknown, next: () => Promise<void>) => next());
      const mw2 = vi.fn((_ctx: unknown, next: () => Promise<void>) => next());

      const plugin = createBridgeVue({ middleware: [mw1, mw2] });
      mount(defineComponent({ setup: () => () => h('div') }), {
        global: { plugins: [plugin] },
      });

      // Get the latest mock instance created during mount
      const calls = (BridgeClient as unknown as MockedBridgeClientCtor).mock.results;
      const instance = calls[calls.length - 1].value;

      expect(instance.use).toHaveBeenCalledTimes(2);
      expect(instance.use).toHaveBeenCalledWith(mw1);
      expect(instance.use).toHaveBeenCalledWith(mw2);
    });

    it('does not call bridge.use() when no middleware provided', async () => {
      const { BridgeClient } = await import('@webview-ts/core');

      const plugin = createBridgeVue();
      mount(defineComponent({ setup: () => () => h('div') }), {
        global: { plugins: [plugin] },
      });

      const calls = (BridgeClient as unknown as MockedBridgeClientCtor).mock.results;
      const instance = calls[calls.length - 1].value;

      expect(instance.use).not.toHaveBeenCalled();
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

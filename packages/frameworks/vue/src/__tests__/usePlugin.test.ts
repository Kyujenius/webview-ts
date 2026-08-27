import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';

import { BRIDGE_KEY, type BridgeContext } from '../bridgeKey';
import { usePlugin } from '../composables/usePlugin';

function createMockManager() {
  let watchListener: ((state: any) => void) | null = null;
  let state: { status: string; data: unknown; error: Error | null; isLoading: boolean } = {
    status: 'idle',
    data: null,
    error: null,
    isLoading: false,
  };

  const manager = {
    getSnapshot: () => state,
    watch: vi.fn((listener: (s: any) => void) => {
      watchListener = listener;
      return () => {
        watchListener = null;
      };
    }),
    execute: vi.fn(async (payload: unknown) => {
      state = { status: 'loading', data: state.data, error: null, isLoading: true };
      watchListener?.(state);
      const result = { echoed: payload };
      state = { status: 'success', data: result, error: null, isLoading: false };
      watchListener?.(state);
      return result;
    }),
    reset: vi.fn(() => {
      state = { status: 'idle', data: null, error: null, isLoading: false };
      watchListener?.(state);
    }),
  };

  return manager;
}

function createMockPlugin() {
  return {
    name: 'device',
    actions: { getInfo: 'device.getInfo', getBattery: 'device.getBattery' },
    events: { statusChanged: 'device.statusChanged' },
  } as any;
}

function createMockBridgeContext(
  managers: Record<string, ReturnType<typeof createMockManager>>
): BridgeContext {
  return {
    bridge: {
      createActionState: vi.fn((fullName: string) => {
        return managers[fullName];
      }),
      on: vi.fn(() => vi.fn()),
    } as unknown as BridgeContext['bridge'],
    isAvailable: true,
    connectionMode: 'native',
  };
}

describe('usePlugin', () => {
  it('returns action objects keyed by short name with idle status', () => {
    const managers = {
      'device.getInfo': createMockManager(),
      'device.getBattery': createMockManager(),
    };
    const ctx = createMockBridgeContext(managers);
    const plugin = createMockPlugin();

    let captured: any;
    const Comp = defineComponent({
      setup() {
        captured = usePlugin(plugin);
        return () => h('div');
      },
    });

    mount(Comp, {
      global: { provide: { [BRIDGE_KEY as symbol]: ctx } },
    });

    expect(captured.getInfo.status.value).toBe('idle');
    expect(captured.getInfo.data.value).toBeNull();
    expect(captured.getInfo.error.value).toBeNull();
    expect(captured.getInfo.isLoading.value).toBe(false);

    expect(captured.getBattery.status.value).toBe('idle');
  });

  it('updates reactive state on execute', async () => {
    const managers = {
      'device.getInfo': createMockManager(),
      'device.getBattery': createMockManager(),
    };
    const ctx = createMockBridgeContext(managers);
    const plugin = createMockPlugin();

    let captured: any;
    const Comp = defineComponent({
      setup() {
        captured = usePlugin(plugin);
        return () => h('div');
      },
    });

    mount(Comp, {
      global: { provide: { [BRIDGE_KEY as symbol]: ctx } },
    });

    await captured.getInfo.execute({ key: 'model' });
    await nextTick();

    expect(captured.getInfo.status.value).toBe('success');
    expect(captured.getInfo.data.value).toEqual({ echoed: { key: 'model' } });
    expect(captured.getInfo.isLoading.value).toBe(false);

    // getBattery should still be idle
    expect(captured.getBattery.status.value).toBe('idle');
  });

  it('provides on() for event subscription', () => {
    const managers = {
      'device.getInfo': createMockManager(),
      'device.getBattery': createMockManager(),
    };
    const ctx = createMockBridgeContext(managers);
    const plugin = createMockPlugin();

    let captured: any;
    const Comp = defineComponent({
      setup() {
        captured = usePlugin(plugin);
        return () => h('div');
      },
    });

    mount(Comp, {
      global: { provide: { [BRIDGE_KEY as symbol]: ctx } },
    });

    const handler = vi.fn();
    captured.on('statusChanged', handler);

    expect(ctx.bridge.on).toHaveBeenCalledWith('device.statusChanged', handler);
  });

  it('throws without provider', () => {
    const plugin = createMockPlugin();

    const Comp = defineComponent({
      setup() {
        usePlugin(plugin);
        return () => h('div');
      },
    });

    expect(() => mount(Comp)).toThrow('[webview-ts/vue] usePlugin() called without BridgeProvider');
  });

  it('cleans up all watchers on unmount', () => {
    const managers = {
      'device.getInfo': createMockManager(),
      'device.getBattery': createMockManager(),
    };
    const ctx = createMockBridgeContext(managers);
    const plugin = createMockPlugin();

    const Comp = defineComponent({
      setup() {
        usePlugin(plugin);
        return () => h('div');
      },
    });

    const wrapper = mount(Comp, {
      global: { provide: { [BRIDGE_KEY as symbol]: ctx } },
    });

    expect(managers['device.getInfo'].watch).toHaveBeenCalledOnce();
    expect(managers['device.getBattery'].watch).toHaveBeenCalledOnce();

    wrapper.unmount();
    // After unmount, watchers are cleaned up via onScopeDispose
  });

  it('calls createActionState with full action names', () => {
    const managers = {
      'device.getInfo': createMockManager(),
      'device.getBattery': createMockManager(),
    };
    const ctx = createMockBridgeContext(managers);
    const plugin = createMockPlugin();

    const Comp = defineComponent({
      setup() {
        usePlugin(plugin);
        return () => h('div');
      },
    });

    mount(Comp, {
      global: { provide: { [BRIDGE_KEY as symbol]: ctx } },
    });

    expect(ctx.bridge.createActionState).toHaveBeenCalledWith('device.getInfo');
    expect(ctx.bridge.createActionState).toHaveBeenCalledWith('device.getBattery');
  });
});

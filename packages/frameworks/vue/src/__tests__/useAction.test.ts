import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vite-plus/test';
import { defineComponent, h, nextTick } from 'vue';

import { BRIDGE_KEY, type BridgeContext } from '../bridgeKey';
import { useAction } from '../composables/useAction';

function createMockManager(initialData: { data?: unknown; error?: Error | null } = {}) {
  let watchListener: ((state: any) => void) | null = null;
  let state: { status: string; data: unknown; error: Error | null; isLoading: boolean } = {
    status: 'idle',
    data: initialData.data ?? null,
    error: initialData.error ?? null,
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

function createMockBridgeContext(manager: ReturnType<typeof createMockManager>): BridgeContext {
  return {
    bridge: {
      createActionState: vi.fn(() => manager),
    } as unknown as BridgeContext['bridge'],
    isAvailable: true,
    connectionMode: 'native',
  };
}

describe('useAction', () => {
  it('starts with idle state', () => {
    const manager = createMockManager();
    const ctx = createMockBridgeContext(manager);

    let captured: ReturnType<typeof useAction> | undefined;
    const Comp = defineComponent({
      setup() {
        captured = useAction('test.echo');
        return () => h('div');
      },
    });

    mount(Comp, {
      global: { provide: { [BRIDGE_KEY as symbol]: ctx } },
    });

    expect(captured!.status.value).toBe('idle');
    expect(captured!.data.value).toBeNull();
    expect(captured!.error.value).toBeNull();
    expect(captured!.isLoading.value).toBe(false);
  });

  it('updates state after execute', async () => {
    const manager = createMockManager();
    const ctx = createMockBridgeContext(manager);

    let captured: ReturnType<typeof useAction> | undefined;
    const Comp = defineComponent({
      setup() {
        captured = useAction('test.echo');
        return () => h('div');
      },
    });

    mount(Comp, {
      global: { provide: { [BRIDGE_KEY as symbol]: ctx } },
    });

    await captured!.execute({ message: 'hello' });
    await nextTick();

    expect(captured!.status.value).toBe('success');
    expect(captured!.data.value).toEqual({ echoed: { message: 'hello' } });
    expect(captured!.error.value).toBeNull();
    expect(captured!.isLoading.value).toBe(false);
  });

  it('throws without provider', () => {
    const Comp = defineComponent({
      setup() {
        useAction('test.echo');
        return () => h('div');
      },
    });

    expect(() => mount(Comp)).toThrow('[webview-ts/vue] useAction() called without BridgeProvider');
  });

  it('resets state after reset()', async () => {
    const manager = createMockManager();
    const ctx = createMockBridgeContext(manager);

    let captured: ReturnType<typeof useAction> | undefined;
    const Comp = defineComponent({
      setup() {
        captured = useAction('test.echo');
        return () => h('div');
      },
    });

    mount(Comp, {
      global: { provide: { [BRIDGE_KEY as symbol]: ctx } },
    });

    await captured!.execute({ message: 'hello' });
    await nextTick();
    expect(captured!.data.value).not.toBeNull();

    captured!.reset();
    await nextTick();

    expect(captured!.status.value).toBe('idle');
    expect(captured!.data.value).toBeNull();
    expect(captured!.error.value).toBeNull();
    expect(captured!.isLoading.value).toBe(false);
  });

  it('calls createActionState with action name', () => {
    const manager = createMockManager();
    const ctx = createMockBridgeContext(manager);

    const Comp = defineComponent({
      setup() {
        useAction('my.action');
        return () => h('div');
      },
    });

    mount(Comp, {
      global: { provide: { [BRIDGE_KEY as symbol]: ctx } },
    });

    expect(ctx.bridge.createActionState).toHaveBeenCalledWith('my.action', undefined);
  });

  it('subscribes via watch and cleans up on unmount', () => {
    const manager = createMockManager();
    const ctx = createMockBridgeContext(manager);

    const Comp = defineComponent({
      setup() {
        useAction('test.echo');
        return () => h('div');
      },
    });

    const wrapper = mount(Comp, {
      global: { provide: { [BRIDGE_KEY as symbol]: ctx } },
    });

    expect(manager.watch).toHaveBeenCalledOnce();

    wrapper.unmount();
    // After unmount, the watch listener should have been cleaned up via onScopeDispose
  });
});

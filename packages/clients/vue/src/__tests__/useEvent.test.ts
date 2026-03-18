import { describe, it, expect, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { BRIDGE_KEY, type BridgeContext } from '../bridgeKey';
import { useEvent } from '../composables/useEvent';

function createMockBridgeContext() {
  const unsub = vi.fn();
  const bridge = {
    on: vi.fn(() => unsub),
  } as unknown as BridgeContext['bridge'];

  const ctx: BridgeContext = {
    bridge,
    isAvailable: true,
    connectionMode: 'native',
  };

  return { ctx, unsub };
}

describe('useEvent', () => {
  it('subscribes to bridge event with correct args', () => {
    const { ctx } = createMockBridgeContext();
    const handler = vi.fn();

    const Comp = defineComponent({
      setup() {
        useEvent('my.event', handler);
        return () => h('div');
      },
    });

    mount(Comp, {
      global: { provide: { [BRIDGE_KEY as symbol]: ctx } },
    });

    expect(ctx.bridge.on).toHaveBeenCalledOnce();
    expect(ctx.bridge.on).toHaveBeenCalledWith('my.event', handler);
  });

  it('cleans up on unmount', () => {
    const { ctx, unsub } = createMockBridgeContext();
    const handler = vi.fn();

    const Comp = defineComponent({
      setup() {
        useEvent('my.event', handler);
        return () => h('div');
      },
    });

    const wrapper = mount(Comp, {
      global: { provide: { [BRIDGE_KEY as symbol]: ctx } },
    });

    expect(unsub).not.toHaveBeenCalled();
    wrapper.unmount();
    expect(unsub).toHaveBeenCalledOnce();
  });

  it('throws without provider', () => {
    const Comp = defineComponent({
      setup() {
        useEvent('my.event', vi.fn());
        return () => h('div');
      },
    });

    expect(() => mount(Comp)).toThrow('[webview-ts/vue] useEvent() called without BridgeProvider');
  });
});

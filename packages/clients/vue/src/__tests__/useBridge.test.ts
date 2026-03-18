import { describe, it, expect } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { BRIDGE_KEY, type BridgeContext } from '../bridgeKey';
import { useBridge } from '../composables/useBridge';

function createMockBridgeContext(overrides: Partial<BridgeContext> = {}): BridgeContext {
  return {
    bridge: {} as BridgeContext['bridge'],
    isAvailable: true,
    connectionMode: 'native',
    ...overrides,
  };
}

describe('useBridge', () => {
  it('returns connectionMode from provided bridge', () => {
    const ctx = createMockBridgeContext({ connectionMode: 'fallback' });

    const Comp = defineComponent({
      setup() {
        const { connectionMode } = useBridge();
        return () => h('div', connectionMode.value);
      },
    });

    const wrapper = mount(Comp, {
      global: { provide: { [BRIDGE_KEY as symbol]: ctx } },
    });

    expect(wrapper.text()).toBe('fallback');
  });

  it('returns isAvailable as a computed ref', () => {
    const ctx = createMockBridgeContext({ isAvailable: false });

    const Comp = defineComponent({
      setup() {
        const { isAvailable } = useBridge();
        return () => h('div', String(isAvailable.value));
      },
    });

    const wrapper = mount(Comp, {
      global: { provide: { [BRIDGE_KEY as symbol]: ctx } },
    });

    expect(wrapper.text()).toBe('false');
  });

  it('returns the bridge instance', () => {
    const mockBridge = { call: () => {} } as unknown as BridgeContext['bridge'];
    const ctx = createMockBridgeContext({ bridge: mockBridge });

    let captured: BridgeContext['bridge'] | undefined;
    const Comp = defineComponent({
      setup() {
        const { bridge } = useBridge();
        captured = bridge;
        return () => h('div');
      },
    });

    mount(Comp, {
      global: { provide: { [BRIDGE_KEY as symbol]: ctx } },
    });

    expect(captured).toBe(mockBridge);
  });

  it('throws when no bridge is provided', () => {
    const Comp = defineComponent({
      setup() {
        useBridge();
        return () => h('div');
      },
    });

    expect(() => mount(Comp)).toThrow('[webview-ts/vue] useBridge() called without BridgeProvider');
  });
});

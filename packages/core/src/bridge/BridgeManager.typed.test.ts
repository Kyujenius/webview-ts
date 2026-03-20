import { describe, it, expect, expectTypeOf } from 'vitest';
import { createBridge } from '../index';
import type { TypedBridge } from '@webview-ts/shared';

type TestActions = {
  'camera.take': { payload: { quality: number }; response: { uri: string } };
  'storage.get': { payload: { key: string }; response: { value: string | null } };
};

describe('BridgeManager with ActionMap', () => {
  it('should accept generic type parameter', () => {
    const bridge = createBridge<TestActions>();
    expectTypeOf(bridge).toMatchTypeOf<TypedBridge<TestActions>>();
  });

  it('should work without type parameter (backward compatible)', () => {
    const bridge = createBridge();
    expect(bridge).toBeDefined();
    expect(typeof bridge.call).toBe('function');
  });

  it('should enforce payload types', () => {
    const bridge = createBridge<TestActions>();
    type CallResult = ReturnType<typeof bridge.call<'camera.take'>>;
    expectTypeOf<CallResult>().toEqualTypeOf<Promise<{ uri: string }>>();
  });
});

type TestEvents = {
  'location.updated': { lat: number; lng: number };
  'theme.changed': 'light' | 'dark';
};

describe('BridgeManager with EventMap', () => {
  it('should accept TEvents generic parameter', () => {
    const bridge = createBridge<TestActions, TestEvents>();
    expect(bridge).toBeDefined();
  });

  it('should infer event payload types', () => {
    const bridge = createBridge<TestActions, TestEvents>();

    // Verify on() handler payload type is inferred
    bridge.on('location.updated', (payload) => {
      expectTypeOf(payload).toEqualTypeOf<{ lat: number; lng: number }>();
    });
    bridge.on('theme.changed', (payload) => {
      expectTypeOf(payload).toEqualTypeOf<'light' | 'dark'>();
    });
  });

  it('should work without TEvents (backward compatible)', () => {
    const bridge = createBridge<TestActions>();
    // Should accept any event string
    const unsub = bridge.on('anything', () => {});
    expect(typeof unsub).toBe('function');
  });
});

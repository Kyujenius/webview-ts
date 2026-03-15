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

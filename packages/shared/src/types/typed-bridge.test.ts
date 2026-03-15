import { describe, it, expectTypeOf } from 'vitest';
import type { TypedBridge } from './typed-bridge';

type TestActions = {
  'camera.take': { payload: { quality: number }; response: { uri: string } };
  'storage.get': { payload: { key: string }; response: { value: string | null } };
};

describe('TypedBridge interface', () => {
  it('should enforce correct payload for call()', () => {
    const bridge = {} as TypedBridge<TestActions>;
    expectTypeOf(bridge.call).parameter(0).toMatchTypeOf<'camera.take' | 'storage.get'>();
  });

  it('should return correct response type from call()', () => {
    const bridge = {} as TypedBridge<TestActions>;
    // Use a wrapper to test return types without runtime invocation
    const cameraCall = () => bridge.call('camera.take', { quality: 0.8 });
    const storageCall = () => bridge.call('storage.get', { key: 'foo' });
    expectTypeOf(cameraCall).returns.toEqualTypeOf<Promise<{ uri: string }>>();
    expectTypeOf(storageCall).returns.toEqualTypeOf<Promise<{ value: string | null }>>();
  });

  it('should include getConfig and isAvailable from Bridge', () => {
    const bridge = {} as TypedBridge<TestActions>;
    expectTypeOf(bridge.isAvailable).toBeFunction();
    expectTypeOf(bridge.getConfig).toBeFunction();
    expectTypeOf(bridge.destroy).toBeFunction();
  });
});

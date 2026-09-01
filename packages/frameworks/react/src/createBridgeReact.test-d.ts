/**
 * Type-level tests for the public React surface — the end-to-end inference
 * chain from definePlugin to every hook.
 * Compiled (never executed) by vitest typecheck mode and `pnpm type-check`.
 */
import { action, definePlugin, event } from '@webview-ts/shared';
import { describe, expectTypeOf, test } from 'vite-plus/test';

import { createBridgeReact } from './createBridgeReact';

const camera = definePlugin('camera', {
  takePhoto: action<{ quality: number }, { uri: string }>(),
  noArgs: action<void, { ok: boolean }>(),
});

const location = definePlugin(
  'location',
  { get: action<void, { lat: number }>() },
  { events: { updated: event<{ lat: number }>() } }
);

const { useAction, useEvent, usePlugin, useBridge } = createBridgeReact({
  plugins: [camera, location],
});

describe('createBridgeReact type inference', () => {
  test('useAction: action keys stay exact — no widening to string', () => {
    expectTypeOf(useAction)
      .parameter(0)
      .toEqualTypeOf<'camera.takePhoto' | 'camera.noArgs' | 'location.get'>();
    // @ts-expect-error — undeclared action names are rejected
    useAction('camera.nope');
  });

  test('usePlugin: payload/response flow into execute and state', () => {
    const handles = usePlugin(camera);
    expectTypeOf(handles.takePhoto.execute).parameter(0).toEqualTypeOf<{ quality: number }>();
    expectTypeOf(handles.takePhoto.execute).returns.resolves.toEqualTypeOf<{ uri: string }>();
    expectTypeOf(handles.takePhoto.data).toEqualTypeOf<{ uri: string } | null>();
    // void-payload action: payload argument drops out
    expectTypeOf(handles.noArgs.execute).toBeCallableWith();
    // @ts-expect-error — wrong payload type is rejected
    handles.takePhoto.execute({ quality: 'high' });
  });

  test('usePlugin: typed event subscriber uses short names', () => {
    const locationHandles = usePlugin(location);
    locationHandles.on('updated', (payload) => {
      expectTypeOf(payload).toEqualTypeOf<{ lat: number }>();
    });
  });

  test('useEvent: event keys and payloads from the contract', () => {
    expectTypeOf(useEvent).parameter(0).toEqualTypeOf<'location.updated'>();
    const useLocationUpdated = useEvent<'location.updated'>;
    expectTypeOf(useLocationUpdated)
      .parameter(1)
      .toEqualTypeOf<(payload: { lat: number }) => void>();
    // @ts-expect-error — undeclared events are rejected
    useEvent('location.nope', () => {});
  });

  test('useBridge().call: same exact keys', () => {
    const { call } = useBridge();
    expectTypeOf(call)
      .parameter(0)
      .toEqualTypeOf<'camera.takePhoto' | 'camera.noArgs' | 'location.get'>();
  });

  test('custom action map generic (no plugins)', () => {
    type CustomActions = {
      'app.custom': { payload: { id: string }; response: { done: boolean } };
    };
    const custom = createBridgeReact<CustomActions>({});
    expectTypeOf(custom.useAction).parameter(0).toEqualTypeOf<'app.custom'>();
  });
});

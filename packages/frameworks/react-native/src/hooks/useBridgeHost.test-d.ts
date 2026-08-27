/**
 * Type-level tests for the host surface — handler inference and typed
 * sendEvent. Compiled (never executed) by vitest typecheck mode and
 * `pnpm type-check`.
 */
import { action, definePlugin, event } from '@webview-ts/shared';
import { describe, expectTypeOf, test } from 'vitest';

import { createBridgeHost } from './useBridgeHost';

type MyActions = {
  'camera.take': { payload: { quality: number }; response: { uri: string } };
  'storage.get': { payload: { key: string }; response: { value: string | null } };
};

const location = definePlugin(
  'location',
  { get: action<void, { lat: number }>() },
  { events: { updated: event<{ lat: number }>() } }
);

describe('createBridgeHost type inference', () => {
  test('direct handlers: payload and response typed from the ActionMap', () => {
    createBridgeHost<MyActions>({
      handlers: {
        'camera.take': async (payload) => {
          expectTypeOf(payload).toEqualTypeOf<{ quality: number }>();
          return { uri: 'x' };
        },
        'storage.get': async (payload) => ({ value: payload.key }),
      },
    });
  });

  test('response shape is enforced', () => {
    createBridgeHost<MyActions>({
      handlers: {
        // @ts-expect-error — response shape is enforced
        'camera.take': async () => ({ wrong: true }),
        'storage.get': async () => ({ value: null }),
      },
    });
  });

  test('every declared action must be implemented', () => {
    createBridgeHost<MyActions>({
      // @ts-expect-error — every declared action must be implemented
      handlers: {
        'camera.take': async () => ({ uri: 'x' }),
      },
    });
  });

  test('plugin host handlers: emit and sendEvent typed from the contract', () => {
    const host = createBridgeHost({
      plugins: [
        location.host({
          get: async (_payload, ctx) => {
            expectTypeOf(ctx.emit).parameter(0).toEqualTypeOf<'updated'>();
            return { lat: 1 };
          },
        }),
      ],
    });

    expectTypeOf(host.sendEvent<'location.updated'>)
      .parameter(1)
      .toEqualTypeOf<{ lat: number }>();
    // @ts-expect-error — contract event payloads are enforced
    host.sendEvent('location.updated', { lat: 'not-a-number' });
    // Arbitrary custom event names stay allowed (open event set)
    host.sendEvent('app.custom', { anything: true });
  });
});

import { defineHandlers } from './useBridgeHost';

describe('defineHandlers — mixed direct handlers + plugins', () => {
  test('keeps plugin inference alive (no explicit type arguments needed)', () => {
    const host = createBridgeHost({
      handlers: defineHandlers<MyActions>({
        'camera.take': async (payload) => {
          expectTypeOf(payload).toEqualTypeOf<{ quality: number }>();
          return { uri: 'x' };
        },
        'storage.get': async () => ({ value: null }),
      }),
      plugins: [location.host({ get: async () => ({ lat: 1 }) })],
    });

    // sendEvent stays typed — the exact thing createBridgeHost<MyActions>(...) loses
    expectTypeOf(host.sendEvent<'location.updated'>)
      .parameter(1)
      .toEqualTypeOf<{ lat: number }>();
    // @ts-expect-error — wrong payloads are still rejected in mixed mode
    host.sendEvent('location.updated', { lat: 'not-a-number' });
  });

  test('wrong handler shapes are rejected inside defineHandlers', () => {
    defineHandlers<MyActions>({
      // @ts-expect-error — response shape is enforced
      'camera.take': async () => ({ wrong: true }),
      'storage.get': async () => ({ value: null }),
    });
  });
});

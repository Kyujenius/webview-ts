/**
 * Type-level tests for plugin map merging.
 * Merge terminals must be `unknown` — a `Record<string, never>` terminal widens
 * `keyof` of the intersection to `string`, silently accepting undeclared names.
 * Compiled (never executed) by vitest typecheck mode and `pnpm type-check`.
 */
import { describe, expectTypeOf, test } from 'vite-plus/test';

import type { MergeHostPluginEvents, MergePluginActions, MergePluginEvents } from './index';
import { action, definePlugin, event } from './index';

const camera = definePlugin('camera', {
  takePhoto: action<{ quality: number }, { uri: string }>(),
});

const location = definePlugin(
  'location',
  { get: action<void, { lat: number }>() },
  { events: { updated: event<{ lat: number }>() } }
);

describe('plugin map merging', () => {
  test('action keys stay exact — no widening to string', () => {
    type MergedActions = MergePluginActions<[typeof camera, typeof location]>;
    expectTypeOf<keyof MergedActions>().toEqualTypeOf<'camera.takePhoto' | 'location.get'>();
    expectTypeOf<MergedActions['camera.takePhoto']>().toEqualTypeOf<{
      payload: { quality: number };
      response: { uri: string };
    }>();
  });

  test('event keys stay exact', () => {
    type MergedEvents = MergePluginEvents<[typeof location]>;
    expectTypeOf<keyof MergedEvents>().toEqualTypeOf<'location.updated'>();
    expectTypeOf<MergedEvents['location.updated']>().toEqualTypeOf<{ lat: number }>();
  });

  test('host() carries the plugin event map for host-side sendEvent typing', () => {
    const hostResult = location.host({
      get: async (_payload, ctx) => {
        ctx.emit('updated', { lat: 1 });
        // @ts-expect-error — undeclared event names are rejected on emit
        ctx.emit('nope', {});
        return { lat: 1 };
      },
    });
    type HostEvents = MergeHostPluginEvents<[typeof hostResult]>;
    expectTypeOf<keyof HostEvents>().toEqualTypeOf<'location.updated'>();
    expectTypeOf<HostEvents['location.updated']>().toEqualTypeOf<{ lat: number }>();
  });

  test('withFallback handlers are typed from the action markers', () => {
    definePlugin('camera2', { takePhoto: action<{ q: number }, { uri: string }>() }).withFallback({
      takePhoto: async (payload) => {
        expectTypeOf(payload).toEqualTypeOf<{ q: number }>();
        return { uri: 'mock' };
      },
    });
  });
});

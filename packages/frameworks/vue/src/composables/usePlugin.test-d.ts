/**
 * Type-level tests for the Vue surface — Ref-wrapped state and execute
 * inference. Compiled (never executed) by vitest typecheck mode and
 * `pnpm type-check`.
 */
import type { ActionStatus, BridgeCallError } from '@webview-ts/shared';
import { action, definePlugin } from '@webview-ts/shared';
import { describe, expectTypeOf, test } from 'vitest';
import type { Ref } from 'vue';

import type { VueUsePluginResult } from './usePlugin';

const camera = definePlugin('camera', {
  takePhoto: action<{ quality: number }, { uri: string }>(),
  noArgs: action<void, { ok: boolean }>(),
});

type CameraResult = VueUsePluginResult<typeof camera>;

describe('vue usePlugin type inference', () => {
  test('handle keys stay exact', () => {
    expectTypeOf<keyof CameraResult>().toEqualTypeOf<'takePhoto' | 'noArgs' | 'on'>();
  });

  test('state fields are Ref-wrapped versions of the shared ActionState', () => {
    expectTypeOf<CameraResult['takePhoto']['status']>().toEqualTypeOf<Ref<ActionStatus>>();
    expectTypeOf<CameraResult['takePhoto']['data']>().toEqualTypeOf<Ref<{ uri: string } | null>>();
    expectTypeOf<CameraResult['takePhoto']['error']>().toEqualTypeOf<Ref<BridgeCallError | null>>();
    expectTypeOf<CameraResult['takePhoto']['isLoading']>().toEqualTypeOf<Ref<boolean>>();
  });

  test('execute keeps payload/response inference', () => {
    expectTypeOf<CameraResult['takePhoto']['execute']>()
      .parameter(0)
      .toEqualTypeOf<{ quality: number }>();
    expectTypeOf<CameraResult['takePhoto']['execute']>().returns.resolves.toEqualTypeOf<{
      uri: string;
    }>();
    expectTypeOf<CameraResult['noArgs']['execute']>().toBeCallableWith();
  });
});

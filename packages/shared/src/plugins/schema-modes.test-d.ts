/**
 * Type-level tests for action()/event() schema vs phantom overloads.
 * Compiled (never executed) by vitest typecheck mode and `pnpm type-check`.
 */
import { describe, expectTypeOf, test } from 'vite-plus/test';
import { z } from 'zod';

import type { ExtractPayload, ExtractPayloadIn, ExtractResponse, ExtractResponseIn } from './index';
import { action, definePlugin, event } from './index';

interface P {
  quality?: number;
}
interface R {
  uri: string;
}

const payloadSchema = z.object({ quality: z.number().default(0.8) });
const responseSchema = z.object({ uri: z.string() });

describe('action()/event() schema modes', () => {
  test('phantom mode: unchanged behavior, In === Out', () => {
    const phantom = action<P, R>({ timeout: 5000 });
    expectTypeOf<ExtractPayload<typeof phantom>>().toEqualTypeOf<P>();
    expectTypeOf<ExtractResponse<typeof phantom>>().toEqualTypeOf<R>();
    expectTypeOf<ExtractPayloadIn<typeof phantom>>().toEqualTypeOf<P>();
    expectTypeOf<ExtractResponseIn<typeof phantom>>().toEqualTypeOf<R>();
  });

  test('schema mode: In/Out split via .default()', () => {
    const withSchema = action({ payload: payloadSchema, response: responseSchema, timeout: 5000 });
    // Caller may omit quality (input type)
    expectTypeOf<ExtractPayloadIn<typeof withSchema>>().toEqualTypeOf<{ quality?: number }>();
    // Host handler always sees quality (output type)
    expectTypeOf<ExtractPayload<typeof withSchema>>().toEqualTypeOf<{ quality: number }>();
    expectTypeOf<ExtractResponse<typeof withSchema>>().toEqualTypeOf<{ uri: string }>();
    expectTypeOf<ExtractResponseIn<typeof withSchema>>().toEqualTypeOf<{ uri: string }>();
  });

  test('partial schema: payload only', () => {
    const payloadOnly = action({ payload: payloadSchema });
    expectTypeOf<ExtractResponse<typeof payloadOnly>>().toEqualTypeOf<void>();
  });

  test('mixing generics + schema is a type error', () => {
    // @ts-expect-error — generics and schema options cannot be combined
    action<P, R>({ payload: payloadSchema });
  });

  test('event(): phantom vs schema', () => {
    const phantomEvent = event<P>();
    expectTypeOf(phantomEvent.__eventPayload).toEqualTypeOf<P>();
    const schemaEvent = event(payloadSchema);
    expectTypeOf(schemaEvent.__eventPayload).toEqualTypeOf<{ quality: number }>();
    expectTypeOf(schemaEvent.__eventPayloadIn).toEqualTypeOf<{ quality?: number }>();
  });

  test('client action map uses payload In', () => {
    const withSchema = action({ payload: payloadSchema, response: responseSchema });
    const plugin = definePlugin('cam', { shoot: withSchema });
    expectTypeOf(plugin._types).toEqualTypeOf<{
      'cam.shoot': { payload: { quality?: number }; response: { uri: string } };
    }>();
  });
});

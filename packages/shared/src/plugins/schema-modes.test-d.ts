/**
 * Type-level tests for action()/event() schema vs phantom overloads.
 * Verified by `pnpm type-check` (tsc), not by vitest runtime.
 */
import { expectTypeOf } from 'vitest';
import { z } from 'zod';

import { action, definePlugin, event } from './index';
import type { ExtractPayload, ExtractPayloadIn, ExtractResponse, ExtractResponseIn } from './types';

// ─── Phantom mode: unchanged behavior ───
interface P {
  quality?: number;
}
interface R {
  uri: string;
}
const phantom = action<P, R>({ timeout: 5000 });
expectTypeOf<ExtractPayload<typeof phantom>>().toEqualTypeOf<P>();
expectTypeOf<ExtractResponse<typeof phantom>>().toEqualTypeOf<R>();
// In === Out when no schema
expectTypeOf<ExtractPayloadIn<typeof phantom>>().toEqualTypeOf<P>();
expectTypeOf<ExtractResponseIn<typeof phantom>>().toEqualTypeOf<R>();

// ─── Schema mode: In/Out split via .default() ───
const payloadSchema = z.object({ quality: z.number().default(0.8) });
const responseSchema = z.object({ uri: z.string() });
const withSchema = action({ payload: payloadSchema, response: responseSchema, timeout: 5000 });
// Caller may omit quality (input type)
expectTypeOf<ExtractPayloadIn<typeof withSchema>>().toEqualTypeOf<{ quality?: number }>();
// Host handler always sees quality (output type)
expectTypeOf<ExtractPayload<typeof withSchema>>().toEqualTypeOf<{ quality: number }>();
expectTypeOf<ExtractResponse<typeof withSchema>>().toEqualTypeOf<{ uri: string }>();
expectTypeOf<ExtractResponseIn<typeof withSchema>>().toEqualTypeOf<{ uri: string }>();

// ─── Partial schema: payload only ───
const payloadOnly = action({ payload: payloadSchema });
expectTypeOf<ExtractResponse<typeof payloadOnly>>().toEqualTypeOf<void>();

// ─── Mixing generics + schema is a type error ───
// @ts-expect-error — generics and schema options cannot be combined
action<P, R>({ payload: payloadSchema });

// ─── event(): phantom vs schema ───
const phantomEvent = event<P>();
expectTypeOf(phantomEvent.__eventPayload).toEqualTypeOf<P>();
const schemaEvent = event(payloadSchema);
expectTypeOf(schemaEvent.__eventPayload).toEqualTypeOf<{ quality: number }>();
expectTypeOf(schemaEvent.__eventPayloadIn).toEqualTypeOf<{ quality?: number }>();

// ─── Host handlers receive Out, return response In; client map uses payload In ───
const plugin = definePlugin('cam', { shoot: withSchema });
expectTypeOf(plugin._types).toEqualTypeOf<{
  'cam.shoot': { payload: { quality?: number }; response: { uri: string } };
}>();

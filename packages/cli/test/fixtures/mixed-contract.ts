import { action, definePlugin } from '@webview-ts/shared';
import * as v from 'valibot';
import { z } from 'zod';

export const zodish = definePlugin('zodish', {
  ok: action({
    payload: z.object({ a: z.string() }),
    response: z.object({ b: z.string() }),
  }),
});

export const valibish = definePlugin('valibish', {
  greet: action({
    payload: v.object({ name: v.string() }),
    response: v.object({ ok: v.boolean() }),
  }),
});

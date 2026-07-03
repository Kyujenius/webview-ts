import { action, definePlugin } from '@webview-ts/shared';
import * as v from 'valibot';

export const vb = definePlugin('vb', {
  greet: action({
    payload: v.object({ name: v.string() }),
    response: v.object({ ok: v.boolean() }),
  }),
});

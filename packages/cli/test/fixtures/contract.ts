import { action, definePlugin, event } from '@webview-ts/shared';
import { z } from 'zod';

export const camera = definePlugin('camera', {
  takePhoto: action({
    payload: z.object({ quality: z.number().min(0).max(1).default(0.8) }),
    response: z.object({ uri: z.string() }),
  }),
  plain: action<{ id: string }, void>(), // schema-less — must appear in warnings
});

export const location = definePlugin(
  'location',
  { noop: action<void, void>() },
  { events: { updated: event(z.object({ lat: z.number(), lng: z.number() })) } }
);

export const notAPlugin = { hello: 'world' }; // must be ignored

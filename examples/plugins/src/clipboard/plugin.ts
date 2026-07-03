import { action, definePlugin } from '@webview-ts/shared';
import { z } from 'zod';

let clipboardText: string | null = null;

export const setClipboardPayload = z.object({ text: z.string() });
export const setClipboardResponse = z.object({});
export const getClipboardResponse = z.object({ text: z.string().nullable() });

export const clipboard = definePlugin('clipboard', {
  getText: action({ response: getClipboardResponse }),
  setText: action({ payload: setClipboardPayload, response: setClipboardResponse }),
}).withFallback({
  getText: async () => ({ text: clipboardText }),
  setText: async (payload) => {
    clipboardText = payload.text;
    return {};
  },
});

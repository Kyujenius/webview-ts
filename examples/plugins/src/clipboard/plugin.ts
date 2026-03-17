import { definePlugin, action } from '@webview-ts/shared';
import type { SetClipboardPayload, GetClipboardResponse } from './types';

let clipboardText: string | null = null;

export const clipboard = definePlugin('clipboard', {
  getText: action<void, GetClipboardResponse>(),
  setText: action<SetClipboardPayload, Record<string, never>>(),
}).withFallback({
  getText: async () => ({ text: clipboardText }),
  setText: async (payload) => {
    clipboardText = payload.text;
    return {};
  },
});

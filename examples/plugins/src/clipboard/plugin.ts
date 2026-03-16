import { definePlugin, action } from '@webview-ts/shared';
import type { SetClipboardPayload, GetClipboardResponse } from './types';

export const clipboard = definePlugin('clipboard', {
  getText: action<void, GetClipboardResponse>(),
  setText: action<SetClipboardPayload, Record<string, never>>(),
});

export const ClipboardActions = clipboard.actions;

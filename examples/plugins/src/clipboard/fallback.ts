import type { FallbackMap } from '@webview-ts/shared';
import { ClipboardActions } from './plugin';

let clipboardText: string | null = null;

export const clipboardFallback: FallbackMap = {
  [ClipboardActions.getText]: async () => ({ text: clipboardText }),
  [ClipboardActions.setText]: async (payload) => {
    clipboardText = (payload as { text: string }).text;
    return {};
  },
};

import { ClipboardActions } from './plugin';

let clipboardText: string | null = null;

export const clipboardFallback = {
  [ClipboardActions.getText]: async () => ({ text: clipboardText }),
  [ClipboardActions.setText]: async (payload: { text: string }) => {
    clipboardText = payload.text;
    return {};
  },
};

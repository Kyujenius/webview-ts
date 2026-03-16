import type { FallbackMap } from '@webview-ts/shared';
import { ShareActions } from './plugin';
import type { SharePayload } from './types';

export const shareFallback: FallbackMap = {
  [ShareActions.share]: async (payload) => {
    const { title, message, url } = payload as SharePayload;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title, text: message, url });
        return { shared: true };
      } catch {
        return { shared: false };
      }
    }

    console.log('[share fallback]', { title, message, url });
    return { shared: false };
  },
};

import { ShareActions } from './plugin';
import type { SharePayload } from './types';

export const shareFallback = {
  [ShareActions.share]: async (payload: SharePayload) => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: payload.title,
          text: payload.message,
          url: payload.url,
        });
        return { shared: true };
      } catch {
        return { shared: false };
      }
    }

    console.log('[share fallback]', payload);
    return { shared: false };
  },
};

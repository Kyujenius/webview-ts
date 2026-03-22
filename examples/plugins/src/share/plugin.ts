import { action, definePlugin } from '@webview-ts/shared';

import type { SharePayload, ShareResponse } from './types';

export const share = definePlugin('share', {
  share: action<SharePayload, ShareResponse>(),
}).withFallback({
  share: async (payload) => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: payload.title, text: payload.message, url: payload.url });
        return { shared: true };
      } catch {
        return { shared: false };
      }
    }

    console.log('[share fallback]', {
      title: payload.title,
      message: payload.message,
      url: payload.url,
    });
    return { shared: false };
  },
});

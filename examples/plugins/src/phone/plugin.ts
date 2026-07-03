import { action, definePlugin } from '@webview-ts/shared';

import type { CallPayload, CallResponse } from './types';

export const phone = definePlugin('phone', {
  call: action<CallPayload, CallResponse>({ timeout: 5000, retry: { maxAttempts: 2, delay: 300 } }),
}).withFallback({
  call: async (payload) => {
    console.log(`[phone fallback] Dialing ${payload.number}`);
    return { success: true };
  },
});

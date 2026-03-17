import { definePlugin, action } from '@webview-ts/shared';
import type { CallPayload, CallResponse } from './types';

export const phone = definePlugin('phone', {
  call: action<CallPayload, CallResponse>(),
}).withFallback({
  call: async (payload) => {
    console.log(`[phone fallback] Dialing ${payload.number}`);
    return { success: true };
  },
});

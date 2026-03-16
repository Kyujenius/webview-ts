import type { FallbackMap } from '@webview-ts/shared';
import { PhoneActions } from './plugin';

export const phoneFallback: FallbackMap = {
  [PhoneActions.call]: async (payload) => {
    const { number } = payload as { number: string };
    console.log(`[phone fallback] Dialing ${number}`);
    return { success: true };
  },
};

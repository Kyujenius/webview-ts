import { HapticsActions } from './plugin';

export const hapticsFallback = {
  [HapticsActions.impact]: async () => ({}),
  [HapticsActions.notification]: async () => ({}),
  [HapticsActions.selection]: async () => ({}),
};

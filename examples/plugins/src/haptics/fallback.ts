import { HapticsActions } from '.';

export const hapticsFallback = {
  [HapticsActions.impact]: async () => ({}),
  [HapticsActions.notification]: async () => ({}),
  [HapticsActions.selection]: async () => ({}),
};

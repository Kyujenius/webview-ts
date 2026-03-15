import { haptics } from '@example/plugins';

export const hapticsHost = haptics.host({
  impact: async (payload) => {
    // TODO: replace with expo-haptics
    console.log('[Host] haptics.impact', payload.style);
    return {};
  },
  notification: async (payload) => {
    console.log('[Host] haptics.notification', payload.type);
    return {};
  },
  selection: async () => {
    return {};
  },
});

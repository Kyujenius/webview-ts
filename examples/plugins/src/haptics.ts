import { definePlugin } from '@ts-bridge/shared';

export type HapticsActions = {
  'haptics.impact': {
    payload: { style?: string };
    response: Record<string, never>;
  };
  'haptics.notification': {
    payload: { type?: string };
    response: Record<string, never>;
  };
  'haptics.selection': {
    payload: undefined;
    response: Record<string, never>;
  };
};

export const haptics = definePlugin<HapticsActions>()({
  name: 'haptics',
  methods: (call) => ({
    impact: (style?: string) => call('haptics.impact', { style }),
    notification: (type?: string) => call('haptics.notification', { type }),
    selection: () => call('haptics.selection', undefined),
  }),
});

import { definePlugin } from '../define';

export type HapticsActions = {
  'haptics.impact': {
    payload: { style?: 'light' | 'medium' | 'heavy' };
    response: {};
  };
  'haptics.notification': {
    payload: { type: 'success' | 'warning' | 'error' };
    response: {};
  };
  'haptics.selection': {
    payload: {};
    response: {};
  };
};

export const haptics = definePlugin<HapticsActions>({
  name: 'haptics',
  methods: (call) => ({
    impact: (style?: 'light' | 'medium' | 'heavy') =>
      call('haptics.impact', { style }),
    notification: (type: 'success' | 'warning' | 'error') =>
      call('haptics.notification', { type }),
    selection: () => call('haptics.selection', {}),
  }),
});

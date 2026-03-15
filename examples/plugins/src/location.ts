import { definePlugin } from '@webview-ts/shared';

export type LocationActions = {
  'location.getCurrentPosition': {
    payload: undefined;
    response: { latitude: number; longitude: number; accuracy: number };
  };
  'location.watchPosition': {
    payload: undefined;
    response: { watchId: number };
  };
  'location.clearWatch': {
    payload: { watchId: number };
    response: Record<string, never>;
  };
};

export const location = definePlugin<LocationActions>()({
  name: 'location',
  methods: (call) => ({
    getCurrentPosition: () => call('location.getCurrentPosition', undefined),
    watchPosition: () => call('location.watchPosition', undefined),
    clearWatch: (watchId: number) => call('location.clearWatch', { watchId }),
  }),
});

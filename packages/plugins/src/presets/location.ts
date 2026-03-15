import { definePlugin } from '../define';

export type LocationActions = {
  'location.getCurrentPosition': {
    payload: { enableHighAccuracy?: boolean; timeout?: number };
    response: { latitude: number; longitude: number; accuracy: number };
  };
  'location.watchPosition': {
    payload: { enableHighAccuracy?: boolean; interval?: number };
    response: { watchId: number };
  };
  'location.clearWatch': {
    payload: { watchId: number };
    response: {};
  };
};

export const location = definePlugin<LocationActions>({
  name: 'location',
  methods: (call) => ({
    getCurrentPosition: (opts?: { enableHighAccuracy?: boolean; timeout?: number }) =>
      call('location.getCurrentPosition', opts ?? {}),
    watchPosition: (opts?: { enableHighAccuracy?: boolean; interval?: number }) =>
      call('location.watchPosition', opts ?? {}),
    clearWatch: (watchId: number) =>
      call('location.clearWatch', { watchId }),
  }),
});

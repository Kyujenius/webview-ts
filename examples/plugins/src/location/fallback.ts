import { LocationActions } from './plugin';

export const locationFallback = {
  [LocationActions.getCurrentPosition]: async () => ({
    latitude: 37.5665,
    longitude: 126.978,
    accuracy: 10,
  }),
  [LocationActions.watchPosition]: async () => ({ watchId: 1 }),
  [LocationActions.clearWatch]: async () => ({}),
};

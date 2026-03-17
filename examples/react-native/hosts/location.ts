import * as Location from 'expo-location';
import { location } from '@example/plugins';

let watchSubscription: Location.LocationSubscription | null = null;

export const locationHost = location.host({
  getCurrentPosition: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? 0,
    };
  },

  watchPosition: async (_payload, ctx) => {
    if (watchSubscription) return { watchId: 1 };

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }

    watchSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 5,
      },
      (loc) => {
        ctx.emit('updated', {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? 0,
        });
      }
    );

    return { watchId: 1 };
  },

  clearWatch: async () => {
    if (watchSubscription) {
      watchSubscription.remove();
      watchSubscription = null;
    }
    return {};
  },
});

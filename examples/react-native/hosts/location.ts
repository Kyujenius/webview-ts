import { location } from '@example/plugins';
import type { Position } from '@example/plugins';

let watchInterval: ReturnType<typeof setInterval> | null = null;
let sendEventFn: ((event: string, payload: unknown) => void) | null = null;

/** Call this from App.tsx to wire up sendEvent */
export function setLocationSendEvent(fn: (event: string, payload: unknown) => void) {
  sendEventFn = fn;
}

export const locationHost = location.host({
  getCurrentPosition: async () => {
    // TODO: replace with expo-location
    return { latitude: 37.5665, longitude: 126.978, accuracy: 5 };
  },
  watchPosition: async () => {
    if (watchInterval) return { watchId: 1 };

    // Simulate periodic location updates via event push
    watchInterval = setInterval(() => {
      const pos: Position = {
        latitude: 37.5665 + (Math.random() - 0.5) * 0.01,
        longitude: 126.978 + (Math.random() - 0.5) * 0.01,
        accuracy: Math.round(Math.random() * 20),
      };
      sendEventFn?.('location.updated', pos);
    }, 3000);

    return { watchId: 1 };
  },
  clearWatch: async () => {
    if (watchInterval) {
      clearInterval(watchInterval);
      watchInterval = null;
    }
    return {};
  },
});

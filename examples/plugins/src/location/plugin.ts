import { definePlugin, action, event } from '@webview-ts/shared';
import type { Position, WatchPositionResponse, ClearWatchPayload } from './types';

export const location = definePlugin(
  'location',
  {
    getCurrentPosition: action<void, Position>(),
    watchPosition: action<void, WatchPositionResponse>(),
    clearWatch: action<ClearWatchPayload, Record<string, never>>(),
  },
  {
    events: {
      updated: event<Position>(),
    },
  }
).withFallback({
  getCurrentPosition: async () => ({ latitude: 37.5665, longitude: 126.978, accuracy: 10 }),
  watchPosition: async () => ({ watchId: 1 }),
  clearWatch: async () => ({}),
});

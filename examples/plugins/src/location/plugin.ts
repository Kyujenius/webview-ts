import { action, definePlugin, event } from '@webview-ts/shared';
import { z } from 'zod';

import type { ClearWatchPayload, Position, WatchPositionResponse } from './types';

/** Seoul City Hall */
const MOCK_POSITION: Position = { latitude: 37.5665, longitude: 126.978, accuracy: 10 };

const positionSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number(),
});

export const location = definePlugin(
  'location',
  {
    getCurrentPosition: action<void, Position>(),
    watchPosition: action<void, WatchPositionResponse>(),
    clearWatch: action<ClearWatchPayload, Record<string, never>>(),
  },
  {
    events: {
      updated: event(positionSchema),
    },
  }
).withFallback({
  getCurrentPosition: async () => MOCK_POSITION,
  watchPosition: async () => ({ watchId: 1 }),
  clearWatch: async () => ({}),
});

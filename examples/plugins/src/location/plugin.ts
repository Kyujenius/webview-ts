import { definePlugin, action } from '@webview-ts/shared';
import type { Position, WatchPositionResponse, ClearWatchPayload } from './types';

export const location = definePlugin('location', {
  getCurrentPosition: action<void, Position>(),
  watchPosition: action<void, WatchPositionResponse>(),
  clearWatch: action<ClearWatchPayload, Record<string, never>>(),
});

export const LocationActions = location.actions;

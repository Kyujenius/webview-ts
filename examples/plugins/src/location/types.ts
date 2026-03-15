export interface Position {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface WatchPositionResponse {
  watchId: number;
}

export interface ClearWatchPayload {
  watchId: number;
}

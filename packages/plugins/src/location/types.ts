/**
 * Location plugin types
 */

/**
 * Location actions
 */
export enum LocationAction {
  GET_CURRENT_POSITION = 'getCurrentPosition',
  WATCH_POSITION = 'watchPosition',
  CLEAR_WATCH = 'clearWatch',
  CHECK_PERMISSION = 'checkPermission',
  REQUEST_PERMISSION = 'requestPermission',
}

/**
 * Location accuracy
 */
export enum LocationAccuracy {
  LOWEST = 'lowest',
  LOW = 'low',
  BALANCED = 'balanced',
  HIGH = 'high',
  HIGHEST = 'highest',
}

/**
 * Location permission type
 */
export enum LocationPermissionType {
  WHEN_IN_USE = 'whenInUse',
  ALWAYS = 'always',
}

/**
 * Location options
 */
export interface LocationOptions {
  accuracy?: LocationAccuracy;
  maximumAge?: number;
  timeout?: number;
  enableHighAccuracy?: boolean;
  distanceFilter?: number;
}

/**
 * Watch position options
 */
export interface WatchPositionOptions extends LocationOptions {
  interval?: number;
  fastestInterval?: number;
}

/**
 * Position coordinates
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
}

/**
 * Position result
 */
export interface Position {
  coords: Coordinates;
  timestamp: number;
  mocked?: boolean;
}

/**
 * Location error codes
 */
export enum LocationErrorCode {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  POSITION_UNAVAILABLE = 'POSITION_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  PLAY_SERVICES_NOT_AVAILABLE = 'PLAY_SERVICES_NOT_AVAILABLE',
}

/**
 * Location error
 */
export interface LocationError {
  code: LocationErrorCode;
  message: string;
}

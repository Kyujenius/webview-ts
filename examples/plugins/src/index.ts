export { camera, CameraActions, cameraFallback } from './camera';
export { storage, StorageActions, storageFallback } from './storage';
export { location, LocationActions, locationFallback } from './location';
export { biometric, BiometricActions, biometricFallback } from './biometric';
export { haptics, HapticsActions, hapticsFallback } from './haptics';

// Plugin types
export type {
  TakePhotoPayload,
  TakePhotoResponse,
  PickImagePayload,
  PickImageResponse,
  RecordVideoPayload,
  RecordVideoResponse,
} from './camera';

export type {
  SetItemPayload,
  GetItemPayload,
  GetItemResponse,
  RemoveItemPayload,
  GetAllKeysResponse,
} from './storage';

export type { Position, WatchPositionResponse, ClearWatchPayload } from './location';

export type {
  CheckAvailabilityResponse,
  AuthenticatePayload,
  AuthenticateResponse,
} from './biometric';

export type { ImpactPayload, NotificationPayload } from './haptics';

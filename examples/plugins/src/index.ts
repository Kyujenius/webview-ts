export { camera, CameraActions, cameraFallback } from './camera';
export { location, LocationActions, locationFallback } from './location';
export { biometric, BiometricActions, biometricFallback } from './biometric';
export { haptics, HapticsActions, hapticsFallback } from './haptics';
export { phone, PhoneActions, phoneFallback } from './phone';
export { calendar, CalendarActions, calendarFallback } from './calendar';
export { device, DeviceActions, deviceFallback } from './device';
export { share, ShareActions, shareFallback } from './share';

// Plugin types
export type {
  TakePhotoPayload,
  TakePhotoResponse,
  PickImagePayload,
  PickImageResponse,
  RecordVideoPayload,
  RecordVideoResponse,
} from './camera';

export type { Position, WatchPositionResponse, ClearWatchPayload } from './location';

export type {
  CheckAvailabilityResponse,
  AuthenticatePayload,
  AuthenticateResponse,
} from './biometric';

export type { ImpactPayload, NotificationPayload } from './haptics';

export type { CallPayload, CallResponse } from './phone';

export type {
  AddEventPayload,
  AddEventResponse,
  GetEventsPayload,
  GetEventsResponse,
  CalendarEvent,
} from './calendar';

export type { DeviceInfoResponse } from './device';

export type { SharePayload, ShareResponse } from './share';

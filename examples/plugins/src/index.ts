export { biometric } from './biometric/plugin';
export { calendar } from './calendar/plugin';
export { camera } from './camera/plugin';
export { clipboard } from './clipboard/plugin';
export { device } from './device/plugin';
export { haptics } from './haptics/plugin';
export { location } from './location/plugin';
export { phone } from './phone/plugin';
export { share } from './share/plugin';
export { storage } from './storage/plugin';

// Plugin types
export type {
  AuthenticatePayload,
  AuthenticateResponse,
  CheckAvailabilityResponse,
} from './biometric/types';
export type {
  AddEventPayload,
  AddEventResponse,
  CalendarEvent,
  GetEventsPayload,
  GetEventsResponse,
} from './calendar/types';
export type {
  PickImagePayload,
  PickImageResponse,
  RecordVideoPayload,
  RecordVideoResponse,
  TakePhotoPayload,
  TakePhotoResponse,
} from './camera/types';
export type { AppStateStatus, DeviceInfoResponse } from './device/types';
export type { ImpactPayload, NotificationPayload } from './haptics/types';
export type { ClearWatchPayload, Position, WatchPositionResponse } from './location/types';
export type { CallPayload, CallResponse } from './phone/types';
export type { SharePayload, ShareResponse } from './share/types';

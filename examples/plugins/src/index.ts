export { camera } from './camera/plugin';
export { location } from './location/plugin';
export { biometric } from './biometric/plugin';
export { haptics } from './haptics/plugin';
export { phone } from './phone/plugin';
export { calendar } from './calendar/plugin';
export { device } from './device/plugin';
export { share } from './share/plugin';
export { clipboard } from './clipboard/plugin';
export { storage } from './storage/plugin';

// Plugin types
export type {
  TakePhotoPayload,
  TakePhotoResponse,
  PickImagePayload,
  PickImageResponse,
  RecordVideoPayload,
  RecordVideoResponse,
} from './camera/types';

export type { Position, WatchPositionResponse, ClearWatchPayload } from './location/types';

export type {
  CheckAvailabilityResponse,
  AuthenticatePayload,
  AuthenticateResponse,
} from './biometric/types';

export type { ImpactPayload, NotificationPayload } from './haptics/types';

export type { CallPayload, CallResponse } from './phone/types';

export type {
  AddEventPayload,
  AddEventResponse,
  GetEventsPayload,
  GetEventsResponse,
  CalendarEvent,
} from './calendar/types';

export type { DeviceInfoResponse } from './device/types';

export type { SharePayload, ShareResponse } from './share/types';

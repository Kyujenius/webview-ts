import { definePlugin, action } from '@webview-ts/shared';
import type {
  TakePhotoPayload,
  TakePhotoResponse,
  PickImagePayload,
  PickImageResponse,
  RecordVideoPayload,
  RecordVideoResponse,
} from './types';

export const camera = definePlugin('camera', {
  takePhoto: action<TakePhotoPayload, TakePhotoResponse>(),
  pickImage: action<PickImagePayload, PickImageResponse>(),
  recordVideo: action<RecordVideoPayload, RecordVideoResponse>(),
});

export const CameraActions = camera.actions;
export { cameraFallback } from './fallback';

export type {
  TakePhotoPayload,
  TakePhotoResponse,
  PickImagePayload,
  PickImageResponse,
  RecordVideoPayload,
  RecordVideoResponse,
} from './types';

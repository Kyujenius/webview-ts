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
}).withFallback({
  takePhoto: async () => ({
    uri: 'https://picsum.photos/400/300',
    width: 400,
    height: 300,
  }),
  pickImage: async (payload) => ({
    images: [
      { uri: 'https://picsum.photos/400/300?1' },
      ...(payload?.multiple ? [{ uri: 'https://picsum.photos/400/300?2' }] : []),
    ],
  }),
  recordVideo: async () => ({
    uri: 'https://example.com/mock-video.mp4',
    duration: 5,
  }),
});

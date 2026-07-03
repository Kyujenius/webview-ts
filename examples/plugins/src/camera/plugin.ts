import { action, definePlugin } from '@webview-ts/shared';
import { z } from 'zod';

export const takePhotoPayload = z.object({ quality: z.number().min(0).max(1).default(0.8) });
export const takePhotoResponse = z.object({
  uri: z.string(),
  width: z.number(),
  height: z.number(),
});
export const pickImagePayload = z.object({ multiple: z.boolean().optional() });
export const pickImageResponse = z.object({ images: z.array(z.object({ uri: z.string() })) });
export const recordVideoPayload = z.object({ maxDuration: z.number().optional() });
export const recordVideoResponse = z.object({ uri: z.string(), duration: z.number() });

export const camera = definePlugin('camera', {
  takePhoto: action({ payload: takePhotoPayload, response: takePhotoResponse }),
  pickImage: action({ payload: pickImagePayload, response: pickImageResponse }),
  recordVideo: action({ payload: recordVideoPayload, response: recordVideoResponse }),
}).withFallback({
  takePhoto: async () => ({ uri: 'https://picsum.photos/400/300', width: 400, height: 300 }),
  pickImage: async (payload) => ({
    images: [
      { uri: 'https://picsum.photos/400/300?1' },
      ...(payload?.multiple ? [{ uri: 'https://picsum.photos/400/300?2' }] : []),
    ],
  }),
  recordVideo: async () => ({ uri: 'https://example.com/mock-video.mp4', duration: 5 }),
});

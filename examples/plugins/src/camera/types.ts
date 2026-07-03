import type { z } from 'zod';

import type {
  pickImagePayload,
  pickImageResponse,
  recordVideoPayload,
  recordVideoResponse,
  takePhotoPayload,
  takePhotoResponse,
} from './plugin';

export type TakePhotoPayload = z.input<typeof takePhotoPayload>;
export type TakePhotoResponse = z.output<typeof takePhotoResponse>;
export type PickImagePayload = z.input<typeof pickImagePayload>;
export type PickImageResponse = z.output<typeof pickImageResponse>;
export type RecordVideoPayload = z.input<typeof recordVideoPayload>;
export type RecordVideoResponse = z.output<typeof recordVideoResponse>;

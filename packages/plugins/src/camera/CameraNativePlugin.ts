/**
 * Camera plugin - Native side
 */

import { BaseNativePlugin } from '../utils/BaseNativePlugin';
import {
  CameraAction,
  type CameraOptions,
  type PickImageOptions,
  type VideoOptions,
  type ImageResult,
  type VideoResult,
} from './types';

/**
 * Camera plugin for React Native
 */
export class CameraNativePlugin extends BaseNativePlugin<CameraAction> {
  constructor() {
    super({
      name: 'camera',
      version: '0.1.0',
      requiresNative: true,
      permissions: ['camera', 'photo_library', 'microphone'],
    });
  }

  async handleAction<TPayload = unknown, TResult = unknown>(
    action: CameraAction,
    payload: TPayload
  ): Promise<TResult> {
    switch (action) {
      case CameraAction.TAKE_PHOTO:
        return this.takePhoto(payload as CameraOptions) as TResult;
      case CameraAction.PICK_IMAGE:
        return this.pickImage(payload as PickImageOptions) as TResult;
      case CameraAction.RECORD_VIDEO:
        return this.recordVideo(payload as VideoOptions) as TResult;
      case CameraAction.CHECK_PERMISSION:
        return this.checkPermission((payload as any).permission) as TResult;
      case CameraAction.REQUEST_PERMISSION:
        return this.requestPermission((payload as any).permission) as TResult;
      default:
        throw new Error(`Unknown camera action: ${action}`);
    }
  }

  /**
   * Take a photo using device camera
   * Note: This is a stub. Actual implementation would use react-native-image-picker or similar
   */
  async takePhoto(_options: CameraOptions): Promise<ImageResult> {
    throw new Error('Not implemented: Use react-native-image-picker in actual app');
  }

  /**
   * Pick image(s) from device gallery
   */
  async pickImage(_options: PickImageOptions): Promise<ImageResult | ImageResult[]> {
    throw new Error('Not implemented: Use react-native-image-picker in actual app');
  }

  /**
   * Record video using device camera
   */
  async recordVideo(_options: VideoOptions): Promise<VideoResult> {
    throw new Error('Not implemented: Use react-native-image-picker in actual app');
  }

  /**
   * Check camera permission
   */
  async checkPermission(_permission: string): Promise<boolean> {
    return false;
  }

  /**
   * Request camera permission
   */
  async requestPermission(_permission: string): Promise<boolean> {
    return false;
  }
}

/**
 * Create camera native plugin
 */
export function createCameraNativePlugin(): CameraNativePlugin {
  return new CameraNativePlugin();
}

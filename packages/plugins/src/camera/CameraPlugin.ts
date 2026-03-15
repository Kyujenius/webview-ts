/**
 * Camera plugin - Web side
 */

import { BaseWebPlugin } from '../utils/BaseWebPlugin';
import type { BridgeManager } from '@ts-bridge/core';
import {
  CameraAction,
  type CameraOptions,
  type PickImageOptions,
  type VideoOptions,
  type ImageResult,
  type VideoResult,
  CameraPermission,
} from './types';
import { PermissionStatus, type PermissionResult } from '../types/plugin';

/**
 * Camera plugin for web-side
 */
export class CameraPlugin extends BaseWebPlugin<CameraAction> {
  constructor(bridge: BridgeManager) {
    super(bridge, {
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
   */
  async takePhoto(options: CameraOptions = {}): Promise<ImageResult> {
    return this.sendToNative(CameraAction.TAKE_PHOTO, options);
  }

  /**
   * Pick image(s) from device gallery
   */
  async pickImage(options: PickImageOptions = {}): Promise<ImageResult | ImageResult[]> {
    return this.sendToNative(CameraAction.PICK_IMAGE, options);
  }

  /**
   * Record video using device camera
   */
  async recordVideo(options: VideoOptions = {}): Promise<VideoResult> {
    return this.sendToNative(CameraAction.RECORD_VIDEO, options);
  }

  /**
   * Check camera permission
   */
  async checkPermission(permission: CameraPermission): Promise<PermissionResult> {
    return this.sendToNative(CameraAction.CHECK_PERMISSION, { permission });
  }

  /**
   * Request camera permission
   */
  async requestPermission(permission: CameraPermission): Promise<PermissionResult> {
    return this.sendToNative(CameraAction.REQUEST_PERMISSION, { permission });
  }

  /**
   * Check if all required permissions are granted
   */
  async hasAllPermissions(): Promise<boolean> {
    const cameraResult = await this.checkPermission(CameraPermission.CAMERA);
    return cameraResult.status === PermissionStatus.GRANTED;
  }
}

/**
 * Create camera plugin
 */
export function createCameraPlugin(bridge: BridgeManager): CameraPlugin {
  return new CameraPlugin(bridge);
}

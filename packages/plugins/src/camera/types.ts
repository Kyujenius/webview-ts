/**
 * Camera plugin types
 */

/**
 * Camera actions
 */
export enum CameraAction {
  TAKE_PHOTO = 'takePhoto',
  PICK_IMAGE = 'pickImage',
  RECORD_VIDEO = 'recordVideo',
  CHECK_PERMISSION = 'checkPermission',
  REQUEST_PERMISSION = 'requestPermission',
}

/**
 * Camera type
 */
export enum CameraType {
  BACK = 'back',
  FRONT = 'front',
}

/**
 * Media type
 */
export enum MediaType {
  PHOTO = 'photo',
  VIDEO = 'video',
  ALL = 'all',
}

/**
 * Image quality
 */
export enum ImageQuality {
  LOW = 0.3,
  MEDIUM = 0.7,
  HIGH = 1.0,
}

/**
 * Camera options
 */
export interface CameraOptions {
  cameraType?: CameraType;
  quality?: ImageQuality | number;
  allowEditing?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  saveToGallery?: boolean;
}

/**
 * Pick image options
 */
export interface PickImageOptions {
  mediaType?: MediaType;
  quality?: ImageQuality | number;
  allowMultiple?: boolean;
  maxCount?: number;
  allowEditing?: boolean;
}

/**
 * Video options
 */
export interface VideoOptions {
  cameraType?: CameraType;
  maxDuration?: number;
  quality?: 'low' | 'medium' | 'high';
  saveToGallery?: boolean;
}

/**
 * Image result
 */
export interface ImageResult {
  uri: string;
  base64?: string;
  width: number;
  height: number;
  fileSize?: number;
  mimeType?: string;
}

/**
 * Video result
 */
export interface VideoResult {
  uri: string;
  duration: number;
  width: number;
  height: number;
  fileSize?: number;
}

/**
 * Camera permission
 */
export enum CameraPermission {
  CAMERA = 'camera',
  PHOTO_LIBRARY = 'photo_library',
  MICROPHONE = 'microphone',
}

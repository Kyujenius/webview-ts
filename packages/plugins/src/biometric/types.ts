/**
 * Biometric plugin types
 */

/**
 * Biometric actions
 */
export enum BiometricAction {
  IS_AVAILABLE = 'isAvailable',
  AUTHENTICATE = 'authenticate',
  GET_AVAILABLE_TYPES = 'getAvailableTypes',
}

/**
 * Biometric type
 */
export enum BiometricType {
  FACE_ID = 'FaceID',
  TOUCH_ID = 'TouchID',
  FINGERPRINT = 'Fingerprint',
  FACE = 'Face',
  IRIS = 'Iris',
}

/**
 * Authentication options
 */
export interface AuthenticationOptions {
  promptMessage?: string;
  cancelButtonText?: string;
  fallbackButtonText?: string;
  disableDeviceFallback?: boolean;
  maxAttempts?: number;
}

/**
 * Authentication result
 */
export interface AuthenticationResult {
  success: boolean;
  error?: string;
  errorCode?: BiometricErrorCode;
  biometricType?: BiometricType;
}

/**
 * Biometric availability result
 */
export interface BiometricAvailability {
  available: boolean;
  biometricTypes: BiometricType[];
  error?: string;
}

/**
 * Biometric error codes
 */
export enum BiometricErrorCode {
  NOT_AVAILABLE = 'NOT_AVAILABLE',
  NOT_ENROLLED = 'NOT_ENROLLED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  USER_CANCEL = 'USER_CANCEL',
  SYSTEM_CANCEL = 'SYSTEM_CANCEL',
  LOCKOUT = 'LOCKOUT',
  LOCKOUT_PERMANENT = 'LOCKOUT_PERMANENT',
  PASSCODE_NOT_SET = 'PASSCODE_NOT_SET',
}

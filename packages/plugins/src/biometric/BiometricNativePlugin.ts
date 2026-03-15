/**
 * Biometric plugin - Native side
 */

import { BaseNativePlugin } from '../utils/BaseNativePlugin';
import {
  BiometricAction,
  type AuthenticationOptions,
  type AuthenticationResult,
  type BiometricAvailability,
  type BiometricType,
} from './types';

/**
 * Biometric plugin for React Native
 */
export class BiometricNativePlugin extends BaseNativePlugin<BiometricAction> {
  constructor() {
    super({
      name: 'biometric',
      version: '0.1.0',
      requiresNative: true,
      permissions: ['biometric'],
    });
  }

  async handleAction<TPayload = unknown, TResult = unknown>(
    action: BiometricAction,
    payload: TPayload
  ): Promise<TResult> {
    switch (action) {
      case BiometricAction.IS_AVAILABLE:
        return this.checkAvailability() as TResult;
      case BiometricAction.AUTHENTICATE:
        return this.authenticate(payload as AuthenticationOptions) as TResult;
      case BiometricAction.GET_AVAILABLE_TYPES:
        return this.getAvailableTypes() as TResult;
      default:
        throw new Error(`Unknown biometric action: ${action}`);
    }
  }

  /**
   * Check if biometric authentication is available
   */
  async checkAvailability(): Promise<BiometricAvailability> {
    return {
      available: false,
      biometricTypes: [],
      error: 'Not implemented: Use react-native-biometrics in actual app',
    };
  }

  /**
   * Authenticate user with biometric
   */
  async authenticate(_options: AuthenticationOptions): Promise<AuthenticationResult> {
    throw new Error('Not implemented: Use react-native-biometrics in actual app');
  }

  /**
   * Get available biometric types
   */
  async getAvailableTypes(): Promise<BiometricType[]> {
    const availability = await this.checkAvailability();
    return availability.biometricTypes;
  }

  /**
   * Check biometric permission (usually not needed)
   */
  async checkPermission(_permission: string): Promise<boolean> {
    return true;
  }

  /**
   * Request biometric permission (usually not needed)
   */
  async requestPermission(_permission: string): Promise<boolean> {
    return true;
  }
}

/**
 * Create biometric native plugin
 */
export function createBiometricNativePlugin(): BiometricNativePlugin {
  return new BiometricNativePlugin();
}

/**
 * Biometric plugin - Web side
 */

import { BaseWebPlugin } from '../utils/BaseWebPlugin';
import type { BridgeManager } from '@ts-bridge/core';
import {
  BiometricAction,
  type AuthenticationOptions,
  type AuthenticationResult,
  type BiometricAvailability,
  type BiometricType,
} from './types';

/**
 * Biometric plugin for web-side
 */
export class BiometricPlugin extends BaseWebPlugin<BiometricAction> {
  constructor(bridge: BridgeManager) {
    super(bridge, {
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
        return this.isAvailable() as TResult;
      case BiometricAction.AUTHENTICATE:
        return this.authenticate(payload as AuthenticationOptions) as TResult;
      case BiometricAction.GET_AVAILABLE_TYPES:
        return this.getAvailableTypes() as TResult;
      default:
        throw new Error(`Unknown biometric action: ${action}`);
    }
  }

  /**
   * Check if biometric authentication is available with detailed info
   */
  async checkAvailability(): Promise<BiometricAvailability> {
    return this.sendToNative(BiometricAction.IS_AVAILABLE, {});
  }

  /**
   * Authenticate user with biometric
   */
  async authenticate(
    options: AuthenticationOptions = {}
  ): Promise<AuthenticationResult> {
    return this.sendToNative(BiometricAction.AUTHENTICATE, options);
  }

  /**
   * Get available biometric types
   */
  async getAvailableTypes(): Promise<BiometricType[]> {
    const availability = await this.checkAvailability();
    return availability.biometricTypes;
  }

  /**
   * Authenticate with custom message
   */
  async authenticateWithMessage(message: string): Promise<AuthenticationResult> {
    return this.authenticate({ promptMessage: message });
  }

  /**
   * Simple authenticate (returns boolean)
   */
  async simpleAuthenticate(): Promise<boolean> {
    const result = await this.authenticate();
    return result.success;
  }
}

/**
 * Create biometric plugin
 */
export function createBiometricPlugin(bridge: BridgeManager): BiometricPlugin {
  return new BiometricPlugin(bridge);
}

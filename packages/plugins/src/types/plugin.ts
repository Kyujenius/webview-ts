/**
 * Base plugin types and interfaces
 */

import type { BridgeMessage, BridgeResponse } from '@ts-bridge/shared';

/**
 * Plugin configuration
 */
export interface PluginConfig {
  name: string;
  version: string;
  requiresNative?: boolean;
  permissions?: string[];
}

/**
 * Plugin interface
 */
export interface Plugin<TActions extends string = string> {
  config: PluginConfig;
  initialize(): Promise<void>;
  handleAction<TPayload = unknown, TResult = unknown>(
    action: TActions,
    payload: TPayload
  ): Promise<TResult>;
  dispose(): Promise<void>;
}

/**
 * Web-side plugin interface
 */
export interface WebPlugin<TActions extends string = string>
  extends Plugin<TActions> {
  isAvailable(): boolean;
  createMessage<TPayload = unknown>(
    action: TActions,
    payload: TPayload
  ): BridgeMessage;
  parseResponse<TResult = unknown>(response: BridgeResponse): TResult;
}

/**
 * Native-side plugin interface
 */
export interface NativePlugin<TActions extends string = string>
  extends Plugin<TActions> {
  checkPermission(permission: string): Promise<boolean>;
  requestPermission(permission: string): Promise<boolean>;
  handleMessage(message: BridgeMessage): Promise<BridgeResponse>;
}

/**
 * Permission status
 */
export enum PermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  NOT_DETERMINED = 'not_determined',
  RESTRICTED = 'restricted',
}

/**
 * Permission result
 */
export interface PermissionResult {
  status: PermissionStatus;
  canAskAgain?: boolean;
}

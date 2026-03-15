/**
 * Location plugin - Native side
 */

import { BaseNativePlugin } from '../utils/BaseNativePlugin';
import {
  LocationAction,
  type LocationOptions,
  type Position,
  LocationPermissionType,
} from './types';
import { PermissionStatus, type PermissionResult } from '../types/plugin';

/**
 * Location plugin for React Native
 */
export class LocationNativePlugin extends BaseNativePlugin<LocationAction> {
  private watchIds: Set<number> = new Set();

  constructor() {
    super({
      name: 'location',
      version: '0.1.0',
      requiresNative: true,
      permissions: ['location_when_in_use', 'location_always'],
    });
  }

  async handleAction<TPayload = unknown, TResult = unknown>(
    action: LocationAction,
    payload: TPayload
  ): Promise<TResult> {
    switch (action) {
      case LocationAction.GET_CURRENT_POSITION:
        return this.getCurrentPosition(payload as LocationOptions) as TResult;
      case LocationAction.WATCH_POSITION:
        return this.watchPosition(payload as LocationOptions) as TResult;
      case LocationAction.CLEAR_WATCH:
        return this.clearWatch((payload as { watchId: number }).watchId) as TResult;
      case LocationAction.CHECK_PERMISSION:
        return this.getPermissionResult((payload as { type: LocationPermissionType }).type) as TResult;
      case LocationAction.REQUEST_PERMISSION:
        return this.requestLocationPermission((payload as { type: LocationPermissionType }).type) as TResult;
      default:
        throw new Error(`Unknown location action: ${action}`);
    }
  }

  /**
   * Get current position
   */
  async getCurrentPosition(_options: LocationOptions): Promise<Position> {
    throw new Error('Not implemented: Use @react-native-community/geolocation in actual app');
  }

  /**
   * Watch position changes
   */
  async watchPosition(_options: LocationOptions): Promise<number> {
    throw new Error('Not implemented: Use @react-native-community/geolocation in actual app');
  }

  /**
   * Clear position watch
   */
  async clearWatch(watchId: number): Promise<void> {
    if (this.watchIds.has(watchId)) {
      this.watchIds.delete(watchId);
    }
  }

  /**
   * Check location permission
   */
  async checkPermission(_permission: string): Promise<boolean> {
    return false;
  }

  /**
   * Request location permission
   */
  async requestPermission(_permission: string): Promise<boolean> {
    return false;
  }

  /**
   * Get permission result
   */
  private async getPermissionResult(type: LocationPermissionType): Promise<PermissionResult> {
    const permission = type === LocationPermissionType.ALWAYS ? 'location_always' : 'location_when_in_use';
    const granted = await this.checkPermission(permission);

    return {
      status: granted ? PermissionStatus.GRANTED : PermissionStatus.DENIED,
      canAskAgain: !granted,
    };
  }

  /**
   * Request location permission
   */
  private async requestLocationPermission(type: LocationPermissionType): Promise<PermissionResult> {
    const permission = type === LocationPermissionType.ALWAYS ? 'location_always' : 'location_when_in_use';
    const granted = await this.requestPermission(permission);

    return {
      status: granted ? PermissionStatus.GRANTED : PermissionStatus.DENIED,
      canAskAgain: !granted,
    };
  }

  /**
   * Cleanup
   */
  async dispose(): Promise<void> {
    for (const watchId of this.watchIds) {
      await this.clearWatch(watchId);
    }
    this.watchIds.clear();
  }
}

/**
 * Create location native plugin
 */
export function createLocationNativePlugin(): LocationNativePlugin {
  return new LocationNativePlugin();
}

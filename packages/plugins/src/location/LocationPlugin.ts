/**
 * Location plugin - Web side
 */

import { BaseWebPlugin } from '../utils/BaseWebPlugin';
import type { BridgeManager } from '@ts-bridge/core';
import {
  LocationAction,
  type LocationOptions,
  type WatchPositionOptions,
  type Position,
  LocationPermissionType,
} from './types';
import type { PermissionResult } from '../types/plugin';

/**
 * Location plugin for web-side
 */
export class LocationPlugin extends BaseWebPlugin<LocationAction> {
  private watchIds: Map<number, string> = new Map();
  private nextWatchId = 1;

  constructor(bridge: BridgeManager) {
    super(bridge, {
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
        return this.watchPosition(
          payload as WatchPositionOptions & { callback: (position: Position) => void }
        ) as TResult;
      case LocationAction.CLEAR_WATCH:
        return this.clearWatch(payload as number) as TResult;
      case LocationAction.CHECK_PERMISSION:
        return this.checkPermission((payload as { type: LocationPermissionType }).type) as TResult;
      case LocationAction.REQUEST_PERMISSION:
        return this.requestPermission((payload as { type: LocationPermissionType }).type) as TResult;
      default:
        throw new Error(`Unknown location action: ${action}`);
    }
  }

  /**
   * Get current position
   */
  async getCurrentPosition(options: LocationOptions = {}): Promise<Position> {
    return this.sendToNative(LocationAction.GET_CURRENT_POSITION, options);
  }

  /**
   * Watch position changes
   */
  async watchPosition(
    _options: WatchPositionOptions & { callback: (position: Position) => void }
  ): Promise<number> {
    const watchId = this.nextWatchId++;
    this.watchIds.set(watchId, `watch-${watchId}`);
    return watchId;
  }

  /**
   * Clear position watch
   */
  async clearWatch(watchId: number): Promise<void> {
    if (this.watchIds.has(watchId)) {
      this.watchIds.delete(watchId);
      await this.sendToNative(LocationAction.CLEAR_WATCH, { watchId });
    }
  }

  /**
   * Check location permission
   */
  async checkPermission(type: LocationPermissionType): Promise<PermissionResult> {
    return this.sendToNative(LocationAction.CHECK_PERMISSION, { type });
  }

  /**
   * Request location permission
   */
  async requestPermission(type: LocationPermissionType): Promise<PermissionResult> {
    return this.sendToNative(LocationAction.REQUEST_PERMISSION, { type });
  }

  /**
   * Cleanup
   */
  async dispose(): Promise<void> {
    for (const watchId of this.watchIds.keys()) {
      await this.clearWatch(watchId);
    }
    this.watchIds.clear();
  }
}

/**
 * Create location plugin
 */
export function createLocationPlugin(bridge: BridgeManager): LocationPlugin {
  return new LocationPlugin(bridge);
}

/**
 * Android JavaScript interface adapter
 */

import type { BridgeMessage } from '@webview-ts/shared';
import { Platform } from '@webview-ts/shared';
import type { NativeAdapter } from './NativeAdapter';

/**
 * Android bridge interface
 */
interface AndroidBridgeInterface {
  postMessage(messageJson: string): void;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidBridgeInterface;
    Android?: AndroidBridgeInterface;
  }
}

/**
 * Adapter for Android JavaScript interface
 */
export class AndroidAdapter implements NativeAdapter {
  private bridge: AndroidBridgeInterface | undefined;

  constructor() {
    // Try both common interface names
    this.bridge = window.AndroidBridge || window.Android;
  }

  /**
   * Send message to Android native
   */
  send(message: BridgeMessage): void {
    if (!this.bridge) {
      throw new Error('Android JavaScript interface not available');
    }

    try {
      // Android expects JSON string
      const messageJson = JSON.stringify(message);
      this.bridge.postMessage(messageJson);
    } catch (error) {
      console.error('[ts-bridge] Failed to send message to Android:', error);
      throw error;
    }
  }

  /**
   * Check if Android bridge is available
   */
  isAvailable(): boolean {
    return this.bridge !== undefined;
  }

  /**
   * Get platform
   */
  getPlatform(): Platform {
    return Platform.ANDROID;
  }
}

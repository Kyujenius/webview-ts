/**
 * Base adapter interface and factory
 */

import type { BridgeMessage } from '@ts-bridge/shared';
import { Platform } from '@ts-bridge/shared';
import { IOSAdapter } from './IOSAdapter';
import { AndroidAdapter } from './AndroidAdapter';
import { platformDetector } from '../utils/platform-detector';

/**
 * Native adapter interface
 */
export interface NativeAdapter {
  /**
   * Send message to native
   */
  send(message: BridgeMessage): void;

  /**
   * Check if adapter is available
   */
  isAvailable(): boolean;

  /**
   * Get platform
   */
  getPlatform(): Platform;
}

/**
 * Create appropriate adapter for current platform
 */
export function createNativeAdapter(): NativeAdapter {
  const platform = platformDetector.detect();

  switch (platform) {
    case Platform.IOS:
      return new IOSAdapter();
    case Platform.ANDROID:
      return new AndroidAdapter();
    default:
      return new MockAdapter();
  }
}

/**
 * Mock adapter for non-WebView environments
 */
class MockAdapter implements NativeAdapter {
  send(_message: BridgeMessage): void {
    console.warn('[ts-bridge] Mock adapter: message not sent (no native bridge available)');
  }

  isAvailable(): boolean {
    return false;
  }

  getPlatform(): Platform {
    return Platform.WEB;
  }
}

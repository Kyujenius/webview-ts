/**
 * Base adapter interface and factory
 */

import type { BridgeMessage, ConnectionMode } from '@webview-ts/shared';
import { Platform } from '@webview-ts/shared';
import { IOSAdapter } from './IOSAdapter';
import { AndroidAdapter } from './AndroidAdapter';
import { ReactNativeWebViewAdapter, isReactNativeWebView } from './ReactNativeWebViewAdapter';
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

  /**
   * Current connection mode
   */
  connectionMode: ConnectionMode;
}

/**
 * Create appropriate adapter for current platform.
 *
 * Priority:
 * 1. react-native-webview (window.ReactNativeWebView) — most common RN host
 * 2. iOS WebKit (window.webkit.messageHandlers.tsBridge)
 * 3. Android JS interface (window.AndroidBridge)
 * 4. MockAdapter (fallback)
 */
export function createNativeAdapter(): NativeAdapter {
  // react-native-webview injects window.ReactNativeWebView
  if (isReactNativeWebView()) {
    return new ReactNativeWebViewAdapter();
  }

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
    console.warn('[webview-ts] Mock adapter: message not sent (no native bridge available)');
  }

  isAvailable(): boolean {
    return false;
  }

  getPlatform(): Platform {
    return Platform.WEB;
  }

  get connectionMode(): ConnectionMode {
    return 'disconnected';
  }
}

/**
 * Client adapter factory
 */

import type { BridgeMessage, ClientAdapter, ConnectionMode } from '@webview-ts/shared';
import { Platform } from '@webview-ts/shared';

import { isReactNativeWebView, ReactNativeWebViewAdapter } from './ReactNativeWebViewAdapter';

/**
 * Create appropriate adapter for current platform.
 *
 * Priority:
 * 1. react-native-webview (window.ReactNativeWebView)
 * 2. MockAdapter (fallback — no native bridge)
 */
export function createClientAdapter(): ClientAdapter {
  if (isReactNativeWebView()) {
    return new ReactNativeWebViewAdapter();
  }
  return new MockAdapter();
}

/**
 * Mock adapter for non-WebView environments
 */
class MockAdapter implements ClientAdapter {
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

/**
 * react-native-webview adapter
 *
 * When a web app runs inside react-native-webview's <WebView>,
 * the library injects `window.ReactNativeWebView.postMessage()`.
 * This adapter uses that channel to send messages to the host.
 */

import type { BridgeMessage } from '@ts-bridge/shared';
import { Platform } from '@ts-bridge/shared';
import type { NativeAdapter } from './NativeAdapter';

interface ReactNativeWebViewInterface {
  postMessage(message: string): void;
}

declare global {
  interface Window {
    ReactNativeWebView?: ReactNativeWebViewInterface;
  }
}

export class ReactNativeWebViewAdapter implements NativeAdapter {
  private bridge: ReactNativeWebViewInterface | undefined;

  constructor() {
    if (typeof window !== 'undefined') {
      this.bridge = window.ReactNativeWebView;
    }
  }

  send(message: BridgeMessage): void {
    if (!this.bridge) {
      throw new Error('ReactNativeWebView not available');
    }

    try {
      this.bridge.postMessage(JSON.stringify(message));
    } catch (error) {
      console.error('[ts-bridge] Failed to send message via ReactNativeWebView:', error);
      throw error;
    }
  }

  isAvailable(): boolean {
    return this.bridge !== undefined;
  }

  getPlatform(): Platform {
    // ReactNativeWebView runs on both iOS and Android,
    // but from the bridge's perspective the transport is the same.
    return Platform.IOS; // Could be Android too; platform-specific logic is host-side
  }
}

/**
 * Check if running inside react-native-webview
 */
export function isReactNativeWebView(): boolean {
  return typeof window !== 'undefined' && window.ReactNativeWebView !== undefined;
}

/**
 * Platform detection utilities
 */

import { Platform, type PlatformDetector } from '@webview-ts/shared';

/**
 * Default platform detector implementation
 */
export class DefaultPlatformDetector implements PlatformDetector {
  /**
   * Detect the current platform
   */
  detect(): Platform {
    if (typeof window === 'undefined') {
      return Platform.UNKNOWN;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();

    // Check for iOS WebKit message handlers
    if ('webkit' in window && 'messageHandlers' in (window as any).webkit) {
      return Platform.IOS;
    }

    // Check for Android JavaScript interface
    if ('AndroidBridge' in window || 'Android' in window) {
      return Platform.ANDROID;
    }

    // Check user agent for mobile platforms
    if (/iphone|ipad|ipod/.test(userAgent)) {
      return Platform.IOS;
    }

    if (/android/.test(userAgent)) {
      return Platform.ANDROID;
    }

    return Platform.WEB;
  }

  /**
   * Check if running in a WebView
   */
  isWebView(): boolean {
    const platform = this.detect();
    return platform === Platform.IOS || platform === Platform.ANDROID;
  }
}

/**
 * Singleton instance
 */
export const platformDetector = new DefaultPlatformDetector();

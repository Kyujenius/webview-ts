/**
 * iOS WebKit message handler adapter
 */

import type { BridgeMessage } from '@ts-bridge/shared';
import { Platform } from '@ts-bridge/shared';
import type { NativeAdapter } from './NativeAdapter';

/**
 * iOS webkit.messageHandlers interface
 */
interface WebKitMessageHandler {
  postMessage(message: unknown): void;
}

interface WebKitNamespace {
  messageHandlers: {
    tsBridge?: WebKitMessageHandler;
  };
}

declare global {
  interface Window {
    webkit?: WebKitNamespace;
  }
}

/**
 * Adapter for iOS WebKit message handlers
 */
export class IOSAdapter implements NativeAdapter {
  private handler: WebKitMessageHandler | undefined;

  constructor() {
    this.handler = window.webkit?.messageHandlers?.tsBridge;
  }

  /**
   * Send message to iOS native
   */
  send(message: BridgeMessage): void {
    if (!this.handler) {
      throw new Error('iOS WebKit message handler not available');
    }

    try {
      this.handler.postMessage(message);
    } catch (error) {
      console.error('[ts-bridge] Failed to send message to iOS:', error);
      throw error;
    }
  }

  /**
   * Check if iOS bridge is available
   */
  isAvailable(): boolean {
    return this.handler !== undefined;
  }

  /**
   * Get platform
   */
  getPlatform(): Platform {
    return Platform.IOS;
  }
}

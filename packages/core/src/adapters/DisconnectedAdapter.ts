/**
 * Adapter for non-WebView environments (no native bridge available).
 * All sends are no-ops with a warning. connectionMode is 'disconnected'.
 */

import type { BridgeMessage, ClientAdapter, ConnectionMode } from '@webview-ts/shared';
import { Platform } from '@webview-ts/shared';

export class DisconnectedAdapter implements ClientAdapter {
  send(_message: BridgeMessage): void {
    console.warn('[webview-ts] No native bridge available — message not sent');
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

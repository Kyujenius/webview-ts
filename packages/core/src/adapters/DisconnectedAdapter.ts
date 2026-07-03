/**
 * Adapter for non-WebView environments (no native bridge available).
 * All sends are no-ops with a warning. connectionMode is 'disconnected'.
 */

import type { BridgeMessage, ClientAdapter, ConnectionMode } from '@webview-ts/shared';

export class DisconnectedAdapter implements ClientAdapter {
  send(_message: BridgeMessage): void {
    console.warn('[webview-ts] No native bridge available — message not sent');
  }

  isAvailable(): boolean {
    return false;
  }

  get connectionMode(): ConnectionMode {
    return 'disconnected';
  }
}

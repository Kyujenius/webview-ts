import type { BridgeMessage } from './message';
import type { Platform, ConnectionMode } from './bridge';

/**
 * Client-side adapter interface for platform-specific message transport.
 * Each platform (React Native WebView, iOS WebKit, Android JSBridge) implements this.
 */
export interface ClientAdapter {
  /** Send message to native host */
  send(message: BridgeMessage): void;

  /** Check if adapter is available */
  isAvailable(): boolean;

  /** Get platform identifier */
  getPlatform(): Platform;

  /** Current connection mode */
  connectionMode: ConnectionMode;
}

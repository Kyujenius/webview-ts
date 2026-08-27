import type { ConnectionMode } from './bridge';
import type { BridgeMessage } from './message';

/**
 * Client-side adapter interface for platform-specific message transport.
 * Each platform (React Native WebView, iOS WebKit, Android JSBridge) implements this.
 */
export interface ClientAdapter {
  /** Send message to native host */
  send(message: BridgeMessage): void;

  /**
   * Subscribe to raw messages from the native host. Returns an unsubscribe
   * function. How messages arrive is transport-specific (e.g. window/document
   * `message` events for React Native WebView) — the adapter owns that
   * knowledge; BridgeClient only parses and dispatches what the callback
   * delivers. Adapters with no inbound channel (disconnected) omit this.
   */
  onMessage?(callback: (raw: string) => void): () => void;

  /** Check if adapter is available */
  isAvailable(): boolean;

  /** Current connection mode */
  connectionMode: ConnectionMode;
}

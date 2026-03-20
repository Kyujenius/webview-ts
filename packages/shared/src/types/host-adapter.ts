/**
 * Host-side adapter interface for platform-specific message transport.
 * Each host platform (React Native, iframe, Flutter, etc.) implements this.
 */
export interface HostAdapter {
  /** Native → Web: send response/event to WebView */
  send(message: string): void;

  /** Web → Native: register callback for incoming messages, returns unsubscribe */
  onMessage(callback: (json: string) => void): () => void;

  /** Cleanup resources */
  destroy(): void;
}

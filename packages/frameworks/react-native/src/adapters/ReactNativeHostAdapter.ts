import type { HostAdapter } from '@webview-ts/shared';
import type { WebView } from 'react-native-webview';

export interface WebViewMessageEvent {
  nativeEvent: {
    data: string;
  };
}

/**
 * HostAdapter implementation for React Native WebView.
 * Replaces the former MessageHandler class.
 */
export class ReactNativeHostAdapter implements HostAdapter {
  private webViewRef?: WebView;
  private listeners = new Set<(json: string) => void>();
  /** Messages sent before the WebView ref is attached — flushed on setWebViewRef.
   *  Note: flush happens at ref attach, which can precede the page's own
   *  listeners; very early sends may still be missed by the page. */
  private pending: string[] = [];
  /** True once a ref has ever been attached — separates the initial mount gap
   *  (queue for the coming page) from a detach (messages target a dead page). */
  private wasAttached = false;
  private static readonly MAX_PENDING = 100;

  setWebViewRef(ref: WebView | null): void {
    if (ref) {
      this.webViewRef = ref;
      this.wasAttached = true;
      if (this.pending.length > 0) {
        const queued = this.pending;
        this.pending = [];
        for (const message of queued) {
          (ref as any).postMessage(message);
        }
      }
    } else {
      this.webViewRef = undefined;
      // The page behind the old ref is gone — anything still queued was
      // addressed to it and must not replay into a future page.
      this.pending = [];
    }
  }

  send(message: string): void {
    if (!this.webViewRef) {
      if (this.wasAttached) {
        // Detached after a live page: this message targets a dead page.
        // Dropping beats replaying stale responses/events into the next page.
        console.warn('[ReactNativeHostAdapter] WebView detached — dropping message');
        return;
      }
      // Initial mount race — queue for the page that is about to attach.
      if (this.pending.length >= ReactNativeHostAdapter.MAX_PENDING) {
        console.warn('[ReactNativeHostAdapter] Pending queue full, dropping oldest message');
        this.pending.shift();
      }
      this.pending.push(message);
      return;
    }
    (this.webViewRef as any).postMessage(message);
  }

  onMessage(callback: (json: string) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Handle the WebView onMessage event.
   * Pass this to <WebView onMessage={adapter.handleNativeEvent} />.
   */
  handleNativeEvent = (event: WebViewMessageEvent): void => {
    const json = event.nativeEvent.data;
    for (const listener of this.listeners) {
      listener(json);
    }
  };

  destroy(): void {
    this.listeners.clear();
    this.webViewRef = undefined;
    this.pending = [];
    this.wasAttached = false;
  }
}

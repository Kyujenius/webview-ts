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

  setWebViewRef(ref: WebView | null): void {
    if (ref) {
      this.webViewRef = ref;
    } else {
      this.webViewRef = undefined;
    }
  }

  send(message: string): void {
    if (!this.webViewRef) {
      console.warn('[ReactNativeHostAdapter] WebView reference not set');
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
  }
}

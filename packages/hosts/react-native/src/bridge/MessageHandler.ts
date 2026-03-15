import type { WebView } from 'react-native-webview';
import type { BridgeHost } from './BridgeHost';

/**
 * Configuration for MessageHandler
 */
export interface MessageHandlerConfig {
  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Custom error handler
   */
  onError?: (error: Error) => void;
}

/**
 * Message event from WebView
 */
export interface WebViewMessageEvent {
  nativeEvent: {
    data: string;
  };
}

/**
 * MessageHandler - Integrates BridgeHost with react-native-webview
 * Handles bidirectional communication between WebView and native
 */
export class MessageHandler {
  private config: Required<MessageHandlerConfig>;
  private bridgeHost: BridgeHost;
  private webViewRef?: WebView;

  constructor(bridgeHost: BridgeHost, config: MessageHandlerConfig = {}) {
    this.config = {
      debug: config.debug ?? false,
      onError: config.onError ?? ((error) => console.error('[MessageHandler]', error)),
    };
    this.bridgeHost = bridgeHost;

    // Set message callback on bridge host
    this.bridgeHost.setMessageCallback((message) => {
      this.sendToWebView(message);
    });
  }

  /**
   * Set WebView reference
   * Call this when WebView is mounted
   */
  setWebViewRef(webViewRef: WebView | null): void {
    if (webViewRef) {
      this.webViewRef = webViewRef;
      this.log('WebView reference set');
    } else {
      this.webViewRef = undefined;
      this.log('WebView reference cleared');
    }
  }

  /**
   * Handle message from WebView
   * Pass this to WebView's onMessage prop
   */
  handleWebViewMessage = (event: WebViewMessageEvent): void => {
    try {
      const messageJson = event.nativeEvent.data;
      this.log('Received message from WebView', messageJson);

      // Forward to bridge host
      this.bridgeHost.handleMessageString(messageJson).catch((error) => {
        this.config.onError(error instanceof Error ? error : new Error(String(error)));
      });
    } catch (error) {
      this.config.onError(error instanceof Error ? error : new Error(String(error)));
    }
  };

  /**
   * Send message to WebView
   */
  private sendToWebView(messageJson: string): void {
    if (!this.webViewRef) {
      const error = new Error('WebView reference not set');
      this.config.onError(error);
      return;
    }

    try {
      // Inject JavaScript to handle the message
      const script = `
        (function() {
          try {
            const message = ${messageJson};
            if (window.__tsBridgeResponseHandler) {
              window.__tsBridgeResponseHandler(message);
            } else {
              console.warn('[ts-bridge] Receive handler not registered');
            }
          } catch (error) {
            console.error('[ts-bridge] Failed to receive message:', error);
          }
        })();
        true; // Required for iOS
      `;

      this.webViewRef.injectJavaScript(script);
      this.log('Sent message to WebView', messageJson);
    } catch (error) {
      this.config.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get the onMessage handler for WebView
   * Convenience method to pass to WebView component
   */
  getOnMessageHandler(): (event: WebViewMessageEvent) => void {
    return this.handleWebViewMessage;
  }

  /**
   * Internal logging
   */
  private log(message: string, data?: unknown): void {
    if (!this.config.debug) {
      return;
    }

    const prefix = '[MessageHandler]';
    if (data !== undefined) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }
}

/**
 * Create a message handler with the given bridge host
 */
export function createMessageHandler(
  bridgeHost: BridgeHost,
  config?: MessageHandlerConfig
): MessageHandler {
  return new MessageHandler(bridgeHost, config);
}

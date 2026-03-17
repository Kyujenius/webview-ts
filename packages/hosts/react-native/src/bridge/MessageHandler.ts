import type { WebView } from 'react-native-webview';
import type { BridgeHost } from './BridgeHost';
import { createDebugLogger } from '../utils/debug-log';

export interface MessageHandlerConfig {
  debug?: boolean;
  onError?: (error: Error) => void;
}

export interface WebViewMessageEvent {
  nativeEvent: {
    data: string;
  };
}

/**
 * MessageHandler - Integrates BridgeHost with react-native-webview.
 *
 * Host → Web communication uses `postMessage()` (standard MessageEvent),
 * NOT `injectJavaScript()` with string interpolation.
 */
export class MessageHandler {
  private config: Required<MessageHandlerConfig>;
  private bridgeHost: BridgeHost;
  private webViewRef?: WebView;
  private log: (message: string, data?: unknown) => void;

  constructor(bridgeHost: BridgeHost, config: MessageHandlerConfig = {}) {
    this.config = {
      debug: config.debug ?? false,
      onError: config.onError ?? ((error) => console.error('[MessageHandler]', error)),
    };
    this.bridgeHost = bridgeHost;
    this.log = createDebugLogger('MessageHandler', this.config.debug);

    this.bridgeHost.setMessageCallback((message) => {
      this.sendToWebView(message);
    });
  }

  setWebViewRef(webViewRef: WebView | null): void {
    if (webViewRef) {
      this.webViewRef = webViewRef;
      this.log('WebView reference set');
    } else {
      this.webViewRef = undefined;
      this.log('WebView reference cleared');
    }
  }

  handleWebViewMessage = (event: WebViewMessageEvent): void => {
    try {
      const messageJson = event.nativeEvent.data;
      this.log('Received message from WebView', messageJson);

      this.bridgeHost.handleMessageString(messageJson).catch((error) => {
        this.config.onError(error instanceof Error ? error : new Error(String(error)));
      });
    } catch (error) {
      this.config.onError(error instanceof Error ? error : new Error(String(error)));
    }
  };

  /**
   * Send message to WebView via postMessage().
   *
   * Uses the standard `window.postMessage` mechanism instead of
   * `injectJavaScript` with raw string interpolation.
   * The web side listens via `window.addEventListener('message', ...)`.
   */
  private sendToWebView(messageJson: string): void {
    if (!this.webViewRef) {
      const error = new Error('WebView reference not set');
      this.config.onError(error);
      return;
    }

    try {
      (this.webViewRef as any).postMessage(messageJson);
      this.log('Sent message to WebView', messageJson);
    } catch (error) {
      this.config.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  getOnMessageHandler(): (event: WebViewMessageEvent) => void {
    return this.handleWebViewMessage;
  }
}

export function createMessageHandler(
  bridgeHost: BridgeHost,
  config?: MessageHandlerConfig
): MessageHandler {
  return new MessageHandler(bridgeHost, config);
}

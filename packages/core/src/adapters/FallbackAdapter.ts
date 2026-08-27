import type {
  BridgeMessage,
  BridgeResponse,
  ConnectionMode,
  FallbackMap,
} from '@webview-ts/shared';
import type { ClientAdapter } from '@webview-ts/shared';
import { BridgeCallError } from '@webview-ts/shared';

import { subscribeWindowMessages } from './window-messages';

export class FallbackAdapter implements ClientAdapter {
  private readonly handlers: FallbackMap;
  private readonly logOnly: boolean;
  private readonly responseCallback: (response: BridgeResponse) => void;
  private readonly bridgeSourceId: string;
  private readonly allowedOrigins: ReadonlySet<string>;

  constructor(
    fallback: true | FallbackMap,
    responseCallback: (response: BridgeResponse) => void,
    bridgeSourceId: string = 'bridge',
    allowedOrigins: ReadonlySet<string> = new Set()
  ) {
    this.logOnly = fallback === true;
    this.handlers = fallback === true ? {} : fallback;
    this.responseCallback = responseCallback;
    this.bridgeSourceId = bridgeSourceId;
    this.allowedOrigins = allowedOrigins;
  }

  /**
   * Browser-dev affordance: events can still be injected as synthetic window
   * `message` events — `window.dispatchEvent(new MessageEvent('message', {data}))`,
   * which carries no `source` and passes the spoofing filter. A real
   * `window.postMessage` sets `source` and is dropped unless its origin is in
   * `allowedOrigins` (see BridgeConfig.allowedOrigins).
   */
  onMessage(callback: (raw: string) => void): () => void {
    return subscribeWindowMessages(callback, this.allowedOrigins);
  }

  send(message: BridgeMessage): void {
    const { id, action, payload } = message;
    if (this.logOnly) {
      console.warn('[webview-ts fallback]', { action, payload });
      this.respondWithError(id, action);
      return;
    }
    const handler = this.handlers[action];
    if (!handler) {
      this.respondWithError(id, action);
      return;
    }
    Promise.resolve(handler(payload))
      .then((data) => {
        this.responseCallback({
          id,
          success: true,
          data,
          timestamp: Date.now(),
          sourceId: 'fallback',
          targetId: this.bridgeSourceId,
        });
      })
      .catch((error) => {
        const code = error instanceof BridgeCallError ? error.code : 'FALLBACK_ERROR';
        const details =
          error instanceof BridgeCallError
            ? (error.details as Record<string, unknown> | undefined)
            : undefined;
        this.responseCallback({
          id,
          success: false,
          error: {
            code,
            message: error instanceof Error ? error.message : String(error),
            ...(details !== undefined && { details }),
          },
          timestamp: Date.now(),
          sourceId: 'fallback',
          targetId: this.bridgeSourceId,
        });
      });
  }

  private respondWithError(id: string, action: string): void {
    this.responseCallback({
      id,
      success: false,
      error: {
        code: 'NO_FALLBACK',
        message: `No fallback handler for action: ${action}`,
      },
      timestamp: Date.now(),
      sourceId: 'fallback',
      targetId: this.bridgeSourceId,
    });
  }

  isAvailable(): boolean {
    return true;
  }

  get connectionMode(): ConnectionMode {
    return 'fallback';
  }
}

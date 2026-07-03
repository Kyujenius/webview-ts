import type {
  BridgeMessage,
  BridgeResponse,
  ConnectionMode,
  FallbackMap,
} from '@webview-ts/shared';
import type { ClientAdapter } from '@webview-ts/shared';

export class FallbackAdapter implements ClientAdapter {
  private readonly handlers: FallbackMap;
  private readonly logOnly: boolean;
  private readonly responseCallback: (response: BridgeResponse) => void;
  private readonly bridgeSourceId: string;

  constructor(
    fallback: true | FallbackMap,
    responseCallback: (response: BridgeResponse) => void,
    bridgeSourceId: string = 'bridge'
  ) {
    this.logOnly = fallback === true;
    this.handlers = fallback === true ? {} : fallback;
    this.responseCallback = responseCallback;
    this.bridgeSourceId = bridgeSourceId;
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
        this.responseCallback({
          id,
          success: false,
          error: {
            code: 'FALLBACK_ERROR',
            message: error instanceof Error ? error.message : String(error),
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

import type { BridgeMessage, BridgeResponse, FallbackMap } from '@ts-bridge/shared';
import { Platform } from '@ts-bridge/shared';
import type { NativeAdapter } from './NativeAdapter';

export class FallbackAdapter implements NativeAdapter {
  private readonly handlers: FallbackMap;
  private readonly logOnly: boolean;
  private readonly responseCallback: (response: BridgeResponse) => void;

  constructor(fallback: true | FallbackMap, responseCallback: (response: BridgeResponse) => void) {
    this.logOnly = fallback === true;
    this.handlers = fallback === true ? {} : fallback;
    this.responseCallback = responseCallback;
  }

  send(message: BridgeMessage): void {
    const { id, action, payload } = message;
    if (this.logOnly) {
      console.warn('[ts-bridge fallback]', { action, payload });
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
        this.responseCallback({ id, success: true, data, timestamp: Date.now() });
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
    });
  }

  isAvailable(): boolean {
    return true;
  }

  getPlatform(): Platform {
    return Platform.WEB;
  }
}

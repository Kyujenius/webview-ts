/**
 * ClientAdapter for a page running inside an iframe.
 * The parent window plays the role the native app plays in the mobile setup.
 */
import type { BridgeMessage, ClientAdapter, ConnectionMode } from '@webview-ts/shared';

export class IframeClientAdapter implements ClientAdapter {
  /**
   * @param parentOrigin - the shell's origin, the ONE trust anchor of this
   * frame. Same-origin embedding: `location.origin`. Cross-origin embedding:
   * the shell's real origin (e.g. 'https://shell.example.com') — a mismatch
   * silently rejects every message by design.
   */
  constructor(private readonly parentOrigin: string) {}

  isAvailable(): boolean {
    // Top-level windows have no parent shell to talk to
    return typeof window !== 'undefined' && window.parent !== window;
  }

  get connectionMode(): ConnectionMode {
    // 'native' here means "a live host is attached" — the parent shell
    return this.isAvailable() ? 'native' : 'disconnected';
  }

  send(message: BridgeMessage): void {
    window.parent.postMessage(JSON.stringify(message), this.parentOrigin);
  }

  onMessage(callback: (raw: string) => void): () => void {
    const listener = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      // Only the shell may speak — anything else is a spoofing attempt
      if (event.origin !== this.parentOrigin) return;
      if (event.source !== window.parent) return;
      callback(event.data);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }
}

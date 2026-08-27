/**
 * HostAdapter for one embedded iframe — the browser twin of the React Native
 * host adapter. One instance per frame, so responses and targeted events can
 * never leak into the wrong frame.
 */
import type { HostAdapter } from '@webview-ts/shared';

export class IframeHostAdapter implements HostAdapter {
  private listeners = new Set<(json: string) => void>();
  private teardown?: () => void;

  /**
   * @param frame - the iframe element this adapter serves
   * @param childOrigin - the frame's origin. Same-origin embedding:
   * `location.origin`. Cross-origin embedding: the frame's real origin.
   */
  constructor(
    private readonly frame: HTMLIFrameElement,
    private readonly childOrigin: string
  ) {}

  send(message: string): void {
    this.frame.contentWindow?.postMessage(message, this.childOrigin);
  }

  onMessage(callback: (json: string) => void): () => void {
    this.listeners.add(callback);
    if (!this.teardown) {
      const listener = (event: MessageEvent) => {
        if (typeof event.data !== 'string') return;
        if (event.origin !== this.childOrigin) return;
        // Accept messages from THIS frame only — the source check is what
        // keeps multiple frames' traffic apart on the shared window listener
        if (event.source !== this.frame.contentWindow) return;
        for (const l of this.listeners) l(event.data);
      };
      window.addEventListener('message', listener);
      this.teardown = () => window.removeEventListener('message', listener);
    }
    return () => {
      this.listeners.delete(callback);
    };
  }

  destroy(): void {
    this.teardown?.();
    this.teardown = undefined;
    this.listeners.clear();
  }
}

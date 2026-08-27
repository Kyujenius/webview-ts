/**
 * Shared window `message` subscription for adapters that receive host
 * messages as DOM events.
 */

/**
 * Subscribe to bridge messages arriving as `message` events.
 *
 * Spoofing protection: native-injected messages are synthetic events with no
 * source window, while a real postMessage from an iframe/parent always
 * carries `source` — those are dropped unless their origin is explicitly
 * allowed (see BridgeConfig.allowedOrigins).
 *
 * `includeDocument`: react-native-webview delivers host->web postMessage
 * differently per platform — iOS dispatches on window, Android dispatches on
 * document with `bubbles: false` (so it never reaches window). The RN adapter
 * listens on both; each platform fires only one.
 */
export function subscribeWindowMessages(
  onRaw: (raw: string) => void,
  allowedOrigins: ReadonlySet<string>,
  options?: { includeDocument?: boolean }
): () => void {
  if (typeof window === 'undefined') return () => {};

  const listener = (event: MessageEvent) => {
    // Ignore non-bridge messages first — cheapest check, runs for all page noise
    if (!event.data || typeof event.data !== 'string') return;
    if (event.source && !allowedOrigins.has(event.origin)) return;
    onRaw(event.data);
  };

  window.addEventListener('message', listener);
  if (options?.includeDocument) {
    document.addEventListener('message', listener as EventListener);
  }
  return () => {
    window.removeEventListener('message', listener);
    if (options?.includeDocument) {
      document.removeEventListener('message', listener as EventListener);
    }
  };
}

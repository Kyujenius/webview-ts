/**
 * Seam between the bridge engine and the DevTools client runtime.
 *
 * core calls connectDevToolsTarget() when a bridge connects — a no-op until a
 * connector is registered. The DevTools runtime (`@webview-ts/devtools/client`)
 * registers itself on import, and late registration attaches to targets that
 * connected first.
 *
 * This keeps the dependency direction clean: shared/core never import the
 * WebSocket runtime; the runtime imports only this seam.
 */

/**
 * Minimal interface that both BridgeClient (core) and BridgeHost (RN) satisfy.
 */
export interface AutoDevToolsTarget {
  onCall(
    event: 'call:start',
    handler: (data: { id: string; action: string; payload: unknown; timestamp: number }) => void
  ): () => void;
  onCall(
    event: 'call:end',
    handler: (data: { id: string; action: string; response: any; duration: number }) => void
  ): () => void;
  onCall(
    event: 'call:error',
    handler: (data: { id: string; action: string; error: Error; duration: number }) => void
  ): () => void;
  /** Subscribe to all events (optional — only BridgeClient has this) */
  onAnyEvent?(handler: (event: string, payload: unknown) => void): () => void;
}

/** Attaches a devtools recorder to one bridge target; returns its cleanup. */
export type DevToolsConnector = (target: AutoDevToolsTarget) => (() => void) | undefined;

let connector: DevToolsConnector | undefined;
/** Targets currently connected, with the connector's cleanup (if attached). */
const liveTargets = new Map<AutoDevToolsTarget, (() => void) | undefined>();

/**
 * Called by the DevTools client runtime when it loads.
 * Attaches to every target that connected before the runtime was imported.
 */
export function registerDevToolsConnector(fn: DevToolsConnector): void {
  connector = fn;
  for (const [target, cleanup] of liveTargets) {
    if (!cleanup) liveTargets.set(target, fn(target));
  }
}

/**
 * Called by the bridge engine on connect(). Returns a cleanup for disconnect().
 * No-op (but tracked, for late registration) when no connector is registered.
 */
export function connectDevToolsTarget(target: AutoDevToolsTarget): () => void {
  // In production no connector can ever register — don't retain targets
  // (apps that recreate clients without destroy() would leak them here)
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    return () => {};
  }
  liveTargets.set(target, connector?.(target));
  return () => {
    const cleanup = liveTargets.get(target);
    liveTargets.delete(target);
    cleanup?.();
  };
}

/** Reset seam state (testing only). */
export function _resetDevToolsRegistry(): void {
  connector = undefined;
  liveTargets.clear();
}

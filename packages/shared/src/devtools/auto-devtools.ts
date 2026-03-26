/**
 * Zero-config DevTools auto-connect.
 *
 * In development mode, automatically tries to connect to the DevTools
 * dashboard server (ws://localhost:4000) and subscribe to bridge lifecycle
 * events. If the server is not running, silently ignores.
 *
 * Uses a module-level singleton WebSocket so that multiple bridge instances
 * (e.g. from React Strict Mode double-invoking useMemo) share one connection.
 *
 * In production, this is a no-op and the entire block is tree-shaken
 * by bundlers via the `process.env.NODE_ENV` guard.
 */

const DEVTOOLS_PORT = 4000;

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

interface RecordPayload {
  recordId: string;
  status: 'pending' | 'success' | 'error' | 'event';
  action: string;
  payload?: unknown;
  responseData?: unknown;
  error?: { code: string; message: string; details?: unknown };
  timestamp: number;
  duration?: number;
  messageId?: string;
  sourceId?: string;
  targetId?: string;
}

function generateRecordId(): string {
  return `record-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function sendRecord(ws: WebSocket | null, record: RecordPayload): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'record', record }));
  }
}

function createRecordingSubscription(target: AutoDevToolsTarget, ws: WebSocket): () => void {
  const unsubs: (() => void)[] = [];

  unsubs.push(
    target.onCall('call:start', (data) => {
      const record: RecordPayload = {
        recordId: generateRecordId(),
        status: 'pending',
        action: data.action,
        payload: data.payload,
        timestamp: data.timestamp,
        messageId: data.id,
      };
      sendRecord(ws, record);
    })
  );

  unsubs.push(
    target.onCall('call:end', (data) => {
      const status = data.response?.success ? 'success' : 'error';
      const record: RecordPayload = {
        recordId: generateRecordId(),
        status,
        action: data.action,
        timestamp: Date.now(),
        duration: data.duration,
        messageId: data.id,
        responseData: data.response?.success ? data.response.data : undefined,
        error: data.response && !data.response.success ? data.response.error : undefined,
      };
      sendRecord(ws, record);
    })
  );

  unsubs.push(
    target.onCall('call:error', (data) => {
      const record: RecordPayload = {
        recordId: generateRecordId(),
        status: 'error',
        action: data.action,
        timestamp: Date.now(),
        duration: data.duration,
        messageId: data.id,
        error: {
          code: 'CALL_ERROR',
          message: data.error.message,
        },
      };
      sendRecord(ws, record);
    })
  );

  return () => unsubs.forEach((fn) => fn());
}

// ---- Singleton WebSocket shared across all bridge instances ----

export type DevToolsRole = 'host' | 'client';

const RETRY_INTERVAL = 3000;

let sharedWs: WebSocket | null = null;
let sharedRole: DevToolsRole = 'client';
let targets = new Set<AutoDevToolsTarget>();
let wsReady = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

/** Per-target event unsubscribe functions */
const eventUnsubs = new Map<AutoDevToolsTarget, () => void>();

/** Per-target recording subscription cleanup functions */
const recordingUnsubs = new Map<AutoDevToolsTarget, () => void>();

function subscribeEvents(target: AutoDevToolsTarget, ws: WebSocket): void {
  if (!target.onAnyEvent) return;
  if (eventUnsubs.has(target)) return; // prevent duplicate subscription

  const unsub = target.onAnyEvent((event: string, payload: unknown) => {
    sendRecord(ws, {
      recordId: generateRecordId(),
      status: 'event',
      action: event,
      payload,
      timestamp: Date.now(),
    });
  });

  eventUnsubs.set(target, unsub);
}

function unsubscribeEvents(target: AutoDevToolsTarget): void {
  const unsub = eventUnsubs.get(target);
  if (unsub) {
    unsub();
    eventUnsubs.delete(target);
  }
}

function subscribeRecording(target: AutoDevToolsTarget, ws: WebSocket): void {
  if (recordingUnsubs.has(target)) return; // prevent duplicate subscription
  const unsub = createRecordingSubscription(target, ws);
  recordingUnsubs.set(target, unsub);
}

function unsubscribeRecording(target: AutoDevToolsTarget): void {
  const unsub = recordingUnsubs.get(target);
  if (unsub) {
    unsub();
    recordingUnsubs.delete(target);
  }
}

function getOrCreateWs(role: DevToolsRole): WebSocket | null {
  if (sharedWs && sharedWs.readyState !== WebSocket.CLOSED) {
    return sharedWs;
  }

  sharedRole = role;

  try {
    sharedWs = new WebSocket(`ws://localhost:${DEVTOOLS_PORT}?role=${role}`);
  } catch {
    return null;
  }

  const thisWs = sharedWs;

  sharedWs.onopen = () => {
    // Guard: ignore if a newer WS has already replaced this one
    if (sharedWs !== thisWs) return;
    wsReady = true;
    for (const t of targets) {
      subscribeRecording(t, sharedWs!);
      subscribeEvents(t, sharedWs!);
    }
  };

  sharedWs.onerror = () => {
    // onclose fires after onerror
  };

  sharedWs.onclose = () => {
    // Guard: ignore if a newer WS has already replaced this one
    if (sharedWs !== thisWs) return;
    wsReady = false;
    for (const t of targets) {
      unsubscribeRecording(t);
      unsubscribeEvents(t);
    }
    sharedWs = null;

    // Retry if there are still active targets
    if (targets.size > 0 && !retryTimer) {
      retryTimer = setTimeout(() => {
        retryTimer = null;
        if (targets.size > 0) getOrCreateWs(sharedRole);
      }, RETRY_INTERVAL);
    }
  };

  return sharedWs;
}

/**
 * Try to auto-connect to the DevTools server.
 * Returns a cleanup function if connected, or undefined if skipped.
 *
 * @param target - Bridge instance to subscribe devtools events on
 * @param role   - 'host' (BridgeHost / RN) or 'client' (BridgeClient / web)
 *
 * Uses a singleton WebSocket — multiple calls share one connection.
 * This prevents duplicate connections from React Strict Mode's
 * double-invocation of useMemo.
 */
export function tryAutoDevTools(
  target: AutoDevToolsTarget,
  role: DevToolsRole = 'client'
): (() => void) | undefined {
  if (process.env.NODE_ENV === 'production') return undefined;
  if (typeof WebSocket === 'undefined') return undefined;

  targets.add(target);

  const ws = getOrCreateWs(role);

  // If WS is already open, register immediately
  if (ws && wsReady) {
    subscribeRecording(target, ws);
    subscribeEvents(target, ws);
  } else if (!ws && !retryTimer) {
    // First connection failed — schedule retry
    retryTimer = setTimeout(() => {
      retryTimer = null;
      if (targets.size > 0) getOrCreateWs(sharedRole);
    }, RETRY_INTERVAL);
  }

  return () => {
    targets.delete(target);
    unsubscribeRecording(target);
    unsubscribeEvents(target);

    // Close WS and stop retrying when no more targets
    if (targets.size === 0) {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (sharedWs) {
        sharedWs.close();
        sharedWs = null;
        wsReady = false;
      }
    }
  };
}

/**
 * Reset singleton state (for testing only).
 */
export function _resetAutoDevTools(): void {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  if (sharedWs) {
    sharedWs.close();
  }
  sharedWs = null;
  targets = new Set();
  eventUnsubs.clear();
  recordingUnsubs.clear();
  wsReady = false;
}

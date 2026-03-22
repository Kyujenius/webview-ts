/**
 * Zero-config DevTools auto-connect.
 *
 * In development mode, automatically tries to connect to the DevTools
 * dashboard server (ws://localhost:4000) and register a lightweight
 * recording middleware. If the server is not running, silently ignores.
 *
 * Uses a module-level singleton WebSocket so that multiple bridge instances
 * (e.g. from React Strict Mode double-invoking useMemo) share one connection.
 *
 * In production, this is a no-op and the entire block is tree-shaken
 * by bundlers via the `process.env.NODE_ENV` guard.
 */

import { METADATA_KEYS } from '../constants/metadata-keys';
import type { Middleware, MiddlewareContext } from '../types/middleware';

const DEVTOOLS_PORT = 4000;
const DEVTOOLS_MW_NAME = '__auto_devtools';

/**
 * Minimal interface that both BridgeClient (core) and BridgeHost (RN) satisfy.
 */
export interface AutoDevToolsTarget {
  prepend(middleware: Middleware): void;
  removeMiddleware(name: string): boolean;
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
  middlewareTrace?: unknown[];
  handlerMs?: number;
  handlerSkipped?: boolean;
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

function createRecordingMiddleware(ws: WebSocket): Middleware {
  const fn = async (ctx: MiddlewareContext, next: () => Promise<void>) => {
    const record: RecordPayload = {
      recordId: generateRecordId(),
      status: 'pending',
      action: ctx.request.action,
      payload: ctx.request.payload,
      timestamp: Date.now(),
      messageId: ctx.request.id,
      sourceId: ctx.request.sourceId,
      targetId: ctx.request.targetId,
    };

    sendRecord(ws, record);
    const startTime = Date.now();

    try {
      await next();

      const duration = Date.now() - startTime;
      const middlewareTrace = ctx.metadata.get(METADATA_KEYS.MW_TRACES);
      const handlerMs = ctx.metadata.get(METADATA_KEYS.HANDLER_MS);
      const handlerSkipped = ctx.metadata.get(METADATA_KEYS.HANDLER_SKIPPED);

      const updated: RecordPayload = {
        ...record,
        status: ctx.response?.success ? 'success' : 'error',
        duration,
        middlewareTrace,
        handlerMs,
        handlerSkipped,
      };

      if (ctx.response?.success) {
        updated.responseData = ctx.response.data;
      } else if (ctx.response && !ctx.response.success) {
        updated.error = ctx.response.error;
      }

      sendRecord(ws, updated);
    } catch (error) {
      const duration = Date.now() - startTime;
      const middlewareTrace = ctx.metadata.get(METADATA_KEYS.MW_TRACES);
      const handlerMs = ctx.metadata.get(METADATA_KEYS.HANDLER_MS);
      const handlerSkipped = ctx.metadata.get(METADATA_KEYS.HANDLER_SKIPPED);

      sendRecord(ws, {
        ...record,
        status: 'error',
        duration,
        error: {
          code: 'MIDDLEWARE_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
        middlewareTrace,
        handlerMs,
        handlerSkipped,
      });

      throw error;
    }
  };

  return { name: DEVTOOLS_MW_NAME, fn, __skipTrace: true };
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
      t.prepend(createRecordingMiddleware(sharedWs!));
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
      t.removeMiddleware(DEVTOOLS_MW_NAME);
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
 * @param target - Bridge instance to attach devtools middleware to
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
    target.prepend(createRecordingMiddleware(ws));
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
    target.removeMiddleware(DEVTOOLS_MW_NAME);
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
  wsReady = false;
}

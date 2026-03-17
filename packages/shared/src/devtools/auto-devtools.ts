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

import type { Middleware, MiddlewareContext } from '../types/middleware';
import { METADATA_KEYS } from '../constants/metadata-keys';

const DEVTOOLS_PORT = 4000;
const DEVTOOLS_MW_NAME = '__auto_devtools';

/**
 * Minimal interface that both BridgeManager (core) and BridgeHost (RN) satisfy.
 */
export interface AutoDevToolsTarget {
  prepend(middleware: Middleware): void;
  removeMiddleware(name: string): boolean;
}

interface RecordPayload {
  recordId: string;
  status: 'pending' | 'success' | 'error';
  action: string;
  payload?: unknown;
  responseData?: unknown;
  error?: { code: string; message: string; details?: unknown };
  timestamp: number;
  duration?: number;
  middlewareTrace?: unknown[];
  handlerMs?: number;
  handlerSkipped?: boolean;
  source?: DevToolsRole;
}

function generateRecordId(): string {
  return `record-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function sendRecord(ws: WebSocket, record: RecordPayload): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'record', record }));
  }
}

function createRecordingMiddleware(ws: WebSocket, role: DevToolsRole): Middleware {
  const fn = async (ctx: MiddlewareContext, next: () => Promise<void>) => {
    const record: RecordPayload = {
      recordId: generateRecordId(),
      status: 'pending',
      action: ctx.request.action,
      payload: ctx.request.payload,
      timestamp: Date.now(),
      source: role,
    };

    sendRecord(ws, record);
    const startTime = Date.now();

    try {
      await next();

      const duration = Date.now() - startTime;
      const middlewareTrace = ctx.metadata.get(METADATA_KEYS.MW_TRACES) as unknown[] | undefined;
      const handlerMs = ctx.metadata.get(METADATA_KEYS.HANDLER_MS) as number | undefined;
      const handlerSkipped = ctx.metadata.get(METADATA_KEYS.HANDLER_SKIPPED) as boolean | undefined;

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
      } else if (ctx.response) {
        updated.error = ctx.response.error as RecordPayload['error'];
      }

      sendRecord(ws, updated);
    } catch (error) {
      const duration = Date.now() - startTime;
      const middlewareTrace = ctx.metadata.get(METADATA_KEYS.MW_TRACES) as unknown[] | undefined;
      const handlerMs = ctx.metadata.get(METADATA_KEYS.HANDLER_MS) as number | undefined;
      const handlerSkipped = ctx.metadata.get(METADATA_KEYS.HANDLER_SKIPPED) as boolean | undefined;

      sendRecord(ws, {
        ...record,
        status: 'error',
        duration,
        error: {
          code: 'MIDDLEWARE_ERROR',
          message: (error as Error).message,
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

let sharedWs: WebSocket | null = null;
let sharedRole: DevToolsRole = 'client';
let targets = new Set<AutoDevToolsTarget>();
let wsReady = false;

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

  sharedWs.onopen = () => {
    wsReady = true;
    // Register middleware on all pending targets
    for (const t of targets) {
      t.prepend(createRecordingMiddleware(sharedWs!, sharedRole));
    }
  };

  sharedWs.onerror = () => {
    // onclose fires after onerror
  };

  sharedWs.onclose = () => {
    wsReady = false;
    // Remove middleware from all active targets
    for (const t of targets) {
      t.removeMiddleware(DEVTOOLS_MW_NAME);
    }
    sharedWs = null;
  };

  return sharedWs;
}

/**
 * Try to auto-connect to the DevTools server.
 * Returns a cleanup function if connected, or undefined if skipped.
 *
 * @param target - Bridge instance to attach devtools middleware to
 * @param role   - 'host' (BridgeHost / RN) or 'client' (BridgeManager / web)
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

  const ws = getOrCreateWs(role);
  if (!ws) return undefined;

  targets.add(target);

  // If WS is already open, register middleware immediately
  if (wsReady) {
    target.prepend(createRecordingMiddleware(ws, role));
  }

  return () => {
    targets.delete(target);
    target.removeMiddleware(DEVTOOLS_MW_NAME);

    // Close WS when no more targets
    if (targets.size === 0 && sharedWs) {
      sharedWs.close();
      sharedWs = null;
      wsReady = false;
    }
  };
}

/**
 * Reset singleton state (for testing only).
 */
export function _resetAutoDevTools(): void {
  if (sharedWs) {
    sharedWs.close();
  }
  sharedWs = null;
  targets = new Set();
  wsReady = false;
}

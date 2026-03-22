/**
 * Host-side middleware examples for BridgeHost.
 *
 * These middleware run on the native side, processing incoming requests
 * from the web client before they reach plugin handlers.
 *
 * Execution order: outermost → innermost → handler → innermost → outermost
 */

import type { Middleware } from '@webview-ts/shared';

// ─── Permission Guard ───
// Block actions that require permission without checking first.

const PERMISSION_REQUIRED_ACTIONS = new Set([
  'camera.takePhoto',
  'camera.pickImage',
  'location.getCurrentPosition',
  'location.watchPosition',
  'biometric.authenticate',
]);

export const permissionGuard: Middleware = {
  name: 'permission-guard',
  fn: async (ctx, next) => {
    if (PERMISSION_REQUIRED_ACTIONS.has(ctx.request.action)) {
      // In a real app, check actual OS permission status here
      const hasPermission = true; // placeholder
      if (!hasPermission) {
        ctx.response = {
          id: ctx.request.id,
          sourceId: 'host',
          targetId: ctx.request.sourceId,
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: `Permission required for ${ctx.request.action}`,
          },
          timestamp: Date.now(),
        };
        return; // short-circuit — don't call handler
      }
    }
    await next();
  },
};

// ─── Rate Limiter ───
// Prevent rapid-fire calls to the same action.

const callTimestamps = new Map<string, number>();
const RATE_LIMIT_MS = 500;

export const rateLimiter: Middleware = {
  name: 'rate-limiter',
  fn: async (ctx, next) => {
    const key = ctx.request.action;
    const lastCall = callTimestamps.get(key) ?? 0;
    const elapsed = Date.now() - lastCall;

    if (elapsed < RATE_LIMIT_MS) {
      ctx.response = {
        id: ctx.request.id,
        sourceId: 'host',
        targetId: ctx.request.sourceId,
        success: false,
        error: {
          code: 'HANDLER_ERROR',
          message: `Rate limited: ${key} (wait ${RATE_LIMIT_MS - elapsed}ms)`,
        },
        timestamp: Date.now(),
      };
      return;
    }

    callTimestamps.set(key, Date.now());
    await next();
  },
};

// ─── Host Logger ───
// Logs all incoming requests and outgoing responses on the native side.

export const hostLogger: Middleware = {
  name: 'host-logger',
  fn: async (ctx, next) => {
    const { action, payload } = ctx.request;
    console.log(`[Host] → ${action}`, payload);
    const start = Date.now();

    await next();

    const duration = Date.now() - start;
    if (ctx.response?.success) {
      console.log(`[Host] ← ${action} OK (${duration}ms)`);
    } else {
      console.log(`[Host] ← ${action} FAIL (${duration}ms)`, ctx.response?.error);
    }
  },
};

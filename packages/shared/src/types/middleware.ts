/**
 * Middleware types for bridge pipeline (Koa-style onion model)
 */

import type { BridgeMessage, BridgeResponse } from './message';
import type { MetadataMap } from '../metadata/MetadataMap';

/**
 * Middleware context passed through the entire request-response lifecycle.
 * A single context instance is shared across all middleware for one call.
 */
export interface MiddlewareContext {
  /** The outgoing request message (mutable — middleware can transform it) */
  request: BridgeMessage;

  /** The response (set after the core send/receive completes) */
  response?: BridgeResponse;

  /** Timestamp when the call started */
  startTime: number;

  /** Type-safe key-value store for middleware to communicate with each other */
  metadata: MetadataMap;
}

/**
 * Koa-style middleware function.
 *
 * - Call `next()` to pass control to the next middleware (and ultimately the core send/receive).
 * - Code before `next()` runs during the REQUEST phase.
 * - Code after `next()` runs during the RESPONSE phase.
 * - NOT calling `next()` short-circuits the pipeline (e.g., circuit breaker, cache hit).
 * - Mutating `ctx.request` before `next()` transforms the outgoing message.
 * - Mutating `ctx.response` after `next()` transforms the result.
 */
export type MiddlewareFn = (ctx: MiddlewareContext, next: () => Promise<void>) => Promise<void>;

/**
 * Named middleware — a function with a name for debugging and removal.
 */
export interface Middleware {
  name: string;
  fn: MiddlewareFn;
  __skipTrace?: boolean;
}

/**
 * Logger middleware options
 */
export interface LoggerMiddlewareOptions {
  /** Log level */
  level?: 'debug' | 'info' | 'warn' | 'error';

  /** Include request payload in logs */
  includePayload?: boolean;

  /** Include response data in logs */
  includeResponse?: boolean;

  /** Custom logger function */
  logger?: (level: string, message: string, data?: unknown) => void;
}

/**
 * Validator middleware options
 */
export interface ValidatorMiddlewareOptions {
  /** Whether to validate requests */
  validateRequests?: boolean;

  /** Whether to validate responses */
  validateResponses?: boolean;

  /** Action to take on validation failure */
  onValidationError?: 'throw' | 'warn' | 'ignore';
}

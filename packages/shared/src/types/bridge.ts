/**
 * Core bridge types and interfaces
 */

import type { BridgeError } from './message';

export interface RetryConfig {
  maxAttempts: number;
  delay: number;
  exponentialBackoff?: boolean;
}

export interface ErrorContext {
  action: string;
  payload?: unknown;
  attempt: number;
  timestamp: number;
}

/**
 * Bridge configuration options
 */
export interface BridgeConfig {
  /**
   * Optional name used to generate a stable sourceId for this bridge instance.
   */
  name?: string;

  /**
   * Default timeout for bridge calls in milliseconds.
   * 0 = disabled (no timeout). Per-action and per-call timeouts take priority.
   * @default 0
   */
  timeout?: number;

  /**
   * Global error handler
   */
  onError?: (error: BridgeError, context: ErrorContext) => void;

  /**
   * Global retry configuration
   */
  retry?: RetryConfig;

  /**
   * Fallback mode for browser development without native bridge.
   * - `true`: log warnings and reject calls
   * - `false`: disable fallback
   * - `FallbackMap`: use provided handlers as mock responses
   */
  fallback?: boolean | FallbackMap;
}

export type FallbackHandler<TPayload = unknown, TResponse = unknown> = (
  payload: TPayload
) => Promise<TResponse> | TResponse;

export type FallbackMap = Record<string, FallbackHandler>;

/**
 * Bridge call options
 */
export interface BridgeCallOptions {
  /**
   * Timeout for this specific call in milliseconds
   */
  timeout?: number;

  /**
   * Retry configuration
   */
  retry?: RetryConfig;
}

/**
 * Options for useAction hook (extends BridgeCallOptions with action-level concerns).
 *
 * Merge priority (shallow merge, narrower wins):
 *   per-call (execute options) > per-action (useAction) > plugin (action marker) > global (BridgeConfig)
 */
export interface UseActionOptions extends BridgeCallOptions {
  /**
   * Simple TTL cache for action results.
   * - `number`: TTL in milliseconds
   * - `true`: cache indefinitely (until reset)
   * - `false | undefined`: no cache (default)
   *
   * Cache key is derived from the serialized payload.
   * Note: if a global cache middleware is also active, both layers will cache.
   */
  cache?: number | boolean;
}

/**
 * Bridge connection mode.
 * - 'native': connected to a real native host (RN WebView, iOS, Android)
 * - 'fallback': using fallback handlers (web-only development)
 * - 'disconnected': no native bridge, no fallback configured
 */
export type ConnectionMode = 'native' | 'fallback' | 'disconnected';

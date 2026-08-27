/**
 * Core bridge types and interfaces
 */

import type { ClientAdapter } from './client-adapter';
import type { BridgeError } from './message';

export interface RetryConfig {
  maxAttempts: number;
  delay: number;
  exponentialBackoff?: boolean;
  /**
   * Decide whether a failed attempt should be retried.
   * Defaults to retrying everything except non-transient errors
   * (`VALIDATION_ERROR`, `HANDLER_NOT_FOUND`) — retrying those can never succeed
   * and, for non-idempotent actions, retrying blindly is dangerous.
   */
  retryIf?: (error: BridgeError) => boolean;
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
   * Custom transport adapter. When provided, platform auto-detection is
   * skipped and this adapter is used instead — the client-side counterpart of
   * BridgeHost.attach(). If the adapter reports unavailable and fallback is
   * enabled, fallback mode still takes over.
   */
  adapter?: ClientAdapter;

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

  /**
   * Origins allowed to send bridge messages via window.postMessage.
   *
   * Native-injected messages carry no `source` window and always pass.
   * Messages with a `source` (posted by an iframe or parent window) are
   * dropped unless their origin is listed here — this prevents third-party
   * frames from spoofing bridge responses/events.
   *
   * Consumed by the built-in adapters (auto-detected RN WebView, fallback).
   * A custom adapter injected via `adapter` owns its own reception and must
   * apply its own sender checks — this setting does not reach it.
   * @default [] (drop all window-sourced messages)
   */
  allowedOrigins?: string[];
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

  /**
   * Aborts the WAIT for this call — the promise rejects with `ABORTED`, the
   * pending callback is cleaned up, and no retry runs. The host-side work is
   * NOT cancelled (it is already executing), the same way fetch's signal
   * drops the connection without un-running the server handler.
   */
  signal?: AbortSignal;
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

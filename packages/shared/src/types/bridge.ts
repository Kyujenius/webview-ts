/**
 * Core bridge types and interfaces
 */

import type { BridgeMessage, BridgeResponse } from './message';

/**
 * Bridge configuration options
 */
export interface BridgeConfig {
  /**
   * Default timeout for bridge calls in milliseconds
   * @default 30000
   */
  timeout?: number;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Maximum number of concurrent requests
   * @default 100
   */
  maxConcurrentRequests?: number;

  /**
   * Enable request deduplication
   * @default true
   */
  enableDeduplication?: boolean;
}

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
  retry?: {
    /**
     * Number of retry attempts
     */
    maxAttempts: number;

    /**
     * Delay between retries in milliseconds
     */
    delay: number;

    /**
     * Whether to use exponential backoff
     */
    exponentialBackoff?: boolean;
  };
}

/**
 * Type-safe action definition
 */
export interface ActionDefinition<TPayload = unknown, TResponse = unknown> {
  /**
   * Action name/identifier
   */
  action: string;

  /**
   * Payload type (for type inference)
   */
  payload?: TPayload;

  /**
   * Response type (for type inference)
   */
  response?: TResponse;
}

/**
 * Bridge interface for web-side API
 */
export interface Bridge {
  /**
   * Call a native action
   */
  call<TPayload = unknown, TResponse = unknown>(
    action: string,
    payload?: TPayload,
    options?: BridgeCallOptions
  ): Promise<TResponse>;

  /**
   * Subscribe to native events
   */
  on<TPayload = unknown>(event: string, handler: (payload: TPayload) => void): () => void;

  /**
   * Unsubscribe from native events
   */
  off(event: string, handler?: (payload: unknown) => void): void;

  /**
   * Check if bridge is available
   */
  isAvailable(): boolean;

  /**
   * Get bridge configuration
   */
  getConfig(): BridgeConfig;
}

/**
 * Native bridge host interface
 */
export interface BridgeHost {
  /**
   * Handle incoming message from web
   */
  handleMessage(message: BridgeMessage): Promise<BridgeResponse>;

  /**
   * Send event to web
   */
  sendEvent<TPayload = unknown>(event: string, payload: TPayload): void;

  /**
   * Register action handler
   */
  registerHandler<TPayload = unknown, TResponse = unknown>(
    action: string,
    handler: (payload: TPayload) => Promise<TResponse>
  ): void;

  /**
   * Unregister action handler
   */
  unregisterHandler(action: string): void;
}

/**
 * Platform detection result
 */
export enum Platform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
  UNKNOWN = 'unknown',
}

/**
 * Platform detector interface
 */
export interface PlatformDetector {
  /**
   * Detect current platform
   */
  detect(): Platform;

  /**
   * Check if running in WebView
   */
  isWebView(): boolean;
}

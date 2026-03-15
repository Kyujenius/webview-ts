/**
 * Middleware types for bridge pipeline
 */

import type { BridgeMessage, BridgeResponse } from './message';

/**
 * Middleware context passed through the pipeline
 */
export interface MiddlewareContext {
  /**
   * Request message
   */
  request: BridgeMessage;

  /**
   * Response (available in response middleware)
   */
  response?: BridgeResponse;

  /**
   * Timestamp when request started
   */
  startTime: number;

  /**
   * Additional context data
   */
  metadata: Record<string, unknown>;
}

/**
 * Middleware function type
 */
export type MiddlewareFunction = (
  context: MiddlewareContext,
  next: () => Promise<void>
) => Promise<void>;

/**
 * Middleware interface
 */
export interface Middleware {
  /**
   * Middleware name for debugging
   */
  name: string;

  /**
   * Execute before request is sent (web-side) or received (native-side)
   */
  onRequest?: (context: MiddlewareContext) => Promise<void>;

  /**
   * Execute after response is received (web-side) or sent (native-side)
   */
  onResponse?: (context: MiddlewareContext) => Promise<void>;

  /**
   * Execute on error
   */
  onError?: (context: MiddlewareContext, error: Error) => Promise<void>;
}

/**
 * Middleware pipeline configuration
 */
export interface MiddlewarePipelineConfig {
  /**
   * List of middleware to execute
   */
  middleware: Middleware[];

  /**
   * Whether to continue pipeline on error
   * @default false
   */
  continueOnError?: boolean;
}

/**
 * Logger middleware options
 */
export interface LoggerMiddlewareOptions {
  /**
   * Log level
   */
  level?: 'debug' | 'info' | 'warn' | 'error';

  /**
   * Include request payload in logs
   */
  includePayload?: boolean;

  /**
   * Include response data in logs
   */
  includeResponse?: boolean;

  /**
   * Custom logger function
   */
  logger?: (level: string, message: string, data?: unknown) => void;
}

/**
 * Validator middleware options
 */
export interface ValidatorMiddlewareOptions {
  /**
   * Whether to validate requests
   */
  validateRequests?: boolean;

  /**
   * Whether to validate responses
   */
  validateResponses?: boolean;

  /**
   * Action to take on validation failure
   */
  onValidationError?: 'throw' | 'warn' | 'ignore';
}

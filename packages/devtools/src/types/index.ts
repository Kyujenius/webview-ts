/**
 * DevTools types and interfaces
 */

import type { DevToolsTransport } from '../transport/DevToolsTransport';

/**
 * Call status lifecycle: PENDING → SUCCESS | ERROR | TIMEOUT
 */
export type MessageStatus = 'pending' | 'success' | 'error' | 'timeout' | 'event';

/**
 * Trace entry for a single middleware or interceptor execution
 */
export interface MiddlewareTrace {
  /** Middleware name */
  name: string;
  /** Layer: global middleware or plugin interceptor */
  layer: 'global' | 'plugin';
  /** Plugin name (only when layer='plugin') */
  plugin?: string;
  /** Time spent before next() (request phase) in ms */
  enterMs: number;
  /** Time spent after next() (response phase) in ms */
  exitMs: number;
  /** Whether this middleware short-circuited (did not call next()) */
  shortCircuit: boolean;
  /** Reason for short-circuit (e.g. "cache-hit", "auth-rejected") */
  shortCircuitReason?: string;
  /** Error thrown by this specific middleware */
  error?: { message: string; stack?: string };
  /** Logs left by middleware via ctx.metadata.set('__mwLog:<name>', [...]) */
  logs?: string[];
  /** Metadata keys added/changed during this middleware's execution */
  metadataChanges?: Record<string, unknown>;
}

/**
 * Recorded call — one entry per bridge.call() lifecycle.
 * Starts as PENDING, then updates to SUCCESS/ERROR/TIMEOUT.
 */
export interface RecordedMessage {
  /** Unique ID for this recording */
  recordId: string;

  /** Call status: PENDING → SUCCESS | ERROR | TIMEOUT */
  status: MessageStatus;

  /** Action name (e.g. 'camera.takePhoto') */
  action: string;

  /** Request payload */
  payload?: unknown;

  /** Response data (populated after completion) */
  responseData?: unknown;

  /** Error info (populated on failure) */
  error?: { code: string; message: string; details?: unknown };

  /** Timestamp when the call started */
  timestamp: number;

  /** Duration in ms (populated after completion) */
  duration?: number;

  /** Stack trace (for errors) */
  stackTrace?: string;

  /** Middleware/interceptor execution trace (for waterfall) */
  middlewareTrace?: MiddlewareTrace[];

  /** Handler execution time in ms */
  handlerMs?: number;

  /** Whether handler was skipped (short-circuited) */
  handlerSkipped?: boolean;

  /** Bridge message ID — correlates request↔response */
  messageId?: string;

  /** Source bridge instance ID (which WebView sent this) */
  sourceId?: string;

  /** Target bridge instance ID (where the message is going) */
  targetId?: string;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /**
   * Total number of messages
   */
  totalMessages: number;

  /**
   * Error count
   */
  errorCount: number;

  /**
   * Timeout count
   */
  timeoutCount: number;
}

/**
 * DevTools configuration
 */
export interface DevToolsConfig {
  /**
   * Enable recording
   * @default true
   */
  enabled?: boolean;

  /**
   * Maximum number of messages to record
   * @default 1000
   */
  maxRecords?: number;

  /**
   * Track performance metrics
   * @default true
   */
  trackPerformance?: boolean;

  /**
   * Capture stack traces for errors
   * @default true
   */
  captureStackTraces?: boolean;

  /**
   * Custom filter — return false to skip recording this action
   */
  filter?: (request: { action: string; payload?: unknown }) => boolean;

  /**
   * Custom event listener for new messages
   */
  onMessage?: (record: RecordedMessage) => void;

  /**
   * Transport for sending recorded messages to external dashboard
   */
  transport?: DevToolsTransport;

  /**
   * Enable debug logging to console
   * @default false
   */
  debug?: boolean;
}

/**
 * DevTools store interface
 */
export interface DevToolsStore {
  /**
   * Add a message to the store
   */
  addMessage(record: RecordedMessage): void;

  /**
   * Update an existing message in-place (for PENDING → SUCCESS/ERROR transitions)
   */
  updateMessage(recordId: string, updates: Partial<RecordedMessage>): void;

  /**
   * Get all recorded messages
   */
  getMessages(): RecordedMessage[];

  /**
   * Get message by record ID
   */
  getMessage(recordId: string): RecordedMessage | undefined;

  /**
   * Get messages by action name
   */
  getMessagesByAction(action: string): RecordedMessage[];

  /**
   * Clear all recorded messages
   */
  clear(): void;

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics;

  /**
   * Export messages as JSON
   */
  export(): string;

  /**
   * Import messages from JSON
   */
  import(data: string): void;
}

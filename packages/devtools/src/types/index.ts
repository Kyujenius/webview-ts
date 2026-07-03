/**
 * DevTools types and interfaces
 */

/**
 * Call status lifecycle: PENDING → SUCCESS | ERROR | TIMEOUT
 */
export type MessageStatus = 'pending' | 'success' | 'error' | 'timeout' | 'event';

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

  /** Bridge message ID — correlates request↔response */
  messageId?: string;

  /** Source bridge instance ID (which WebView sent this) */
  sourceId?: string;

  /** Target bridge instance ID (where the message is going) */
  targetId?: string;
}

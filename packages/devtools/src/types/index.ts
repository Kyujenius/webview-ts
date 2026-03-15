/**
 * DevTools types and interfaces
 */

import type { BridgeMessage, BridgeResponse } from '@ts-bridge/shared';

/**
 * Message direction
 */
export enum MessageDirection {
  REQUEST = 'request',
  RESPONSE = 'response',
  EVENT = 'event',
}

/**
 * Message status
 */
export enum MessageStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  ERROR = 'error',
  TIMEOUT = 'timeout',
}

/**
 * Recorded message for timeline
 */
export interface RecordedMessage {
  /**
   * Unique ID for this recording
   */
  recordId: string;

  /**
   * Message direction
   */
  direction: MessageDirection;

  /**
   * Message status
   */
  status: MessageStatus;

  /**
   * Original message (request or response)
   */
  message: BridgeMessage | BridgeResponse;

  /**
   * Timestamp when recorded
   */
  timestamp: number;

  /**
   * Duration in milliseconds (for responses)
   */
  duration?: number;

  /**
   * Stack trace (for errors)
   */
  stackTrace?: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>;
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
   * Average response time in ms
   */
  averageResponseTime: number;

  /**
   * Min response time in ms
   */
  minResponseTime: number;

  /**
   * Max response time in ms
   */
  maxResponseTime: number;

  /**
   * Success rate (0-1)
   */
  successRate: number;

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
   * Custom message filter
   */
  filter?: (message: BridgeMessage | BridgeResponse) => boolean;

  /**
   * Custom event listener for new messages
   */
  onMessage?: (record: RecordedMessage) => void;
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
   * Get all recorded messages
   */
  getMessages(): RecordedMessage[];

  /**
   * Get message by record ID
   */
  getMessage(recordId: string): RecordedMessage | undefined;

  /**
   * Get messages by message ID
   */
  getMessagesByMessageId(messageId: string): RecordedMessage[];

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

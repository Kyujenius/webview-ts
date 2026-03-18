/**
 * Core message types for WebView-Native communication
 */

import type { BridgeErrorCode } from './errors';

/**
 * Base message structure sent between web and native
 */
export interface BridgeMessage<T = unknown> {
  /**
   * Unique identifier for this message
   */
  id: string;

  /**
   * Action/method to be invoked
   */
  action: string;

  /**
   * Payload data for the action
   */
  payload?: T;

  /**
   * Timestamp when message was created
   */
  timestamp: number;
}

/**
 * Response message structure from native to web (discriminated union)
 */
export type BridgeResponse<T = unknown> = BridgeSuccessResponse<T> | BridgeErrorResponse;

export interface BridgeSuccessResponse<T = unknown> {
  id: string;
  success: true;
  data: T;
  timestamp: number;
}

export interface BridgeErrorResponse {
  id: string;
  success: false;
  error: BridgeError;
  timestamp: number;
}

/**
 * Error structure for bridge communication
 */
export interface BridgeError {
  /**
   * Error code for categorization
   */
  code: BridgeErrorCode;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * Additional error details
   */
  details?: Record<string, unknown>;
}

/**
 * Event message for native-to-web push notifications
 */
export interface BridgeEvent<T = unknown> {
  /**
   * Event name/type
   */
  event: string;

  /**
   * Event payload
   */
  payload: T;

  /**
   * Timestamp when event occurred
   */
  timestamp: number;
}

/**
 * Message types for distinguishing message kinds
 */
export enum MessageType {
  REQUEST = 'request',
  RESPONSE = 'response',
  EVENT = 'event',
}

/**
 * Wrapper for all bridge messages with type discrimination
 */
export interface TypedBridgeMessage<T = unknown> {
  type: MessageType;
  data: BridgeMessage<T> | BridgeResponse<T> | BridgeEvent<T>;
}

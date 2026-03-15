/**
 * DevToolsMiddleware - Intercepts and records all bridge messages
 */

import type { Middleware, MiddlewareContext } from '@ts-bridge/shared';
import type {
  DevToolsConfig,
  RecordedMessage,
  DevToolsStore,
} from '../types/index';
import {
  MessageDirection,
  MessageStatus,
} from '../types/index';
import { DevToolsStoreImpl } from '../logger/DevToolsStore';

/**
 * DevTools middleware for intercepting bridge messages
 */
export class DevToolsMiddleware implements Middleware {
  private config: Required<DevToolsConfig>;
  private store: DevToolsStore;
  private requestTimestamps: Map<string, number>;

  constructor(config: DevToolsConfig = {}, store?: DevToolsStore) {
    this.config = {
      enabled: config.enabled ?? true,
      maxRecords: config.maxRecords ?? 1000,
      trackPerformance: config.trackPerformance ?? true,
      captureStackTraces: config.captureStackTraces ?? true,
      filter: config.filter ?? (() => true),
      onMessage: config.onMessage ?? (() => {}),
    };

    this.store = store ?? new DevToolsStoreImpl(this.config.maxRecords);
    this.requestTimestamps = new Map();
  }

  /**
   * Get the devtools store
   */
  getStore(): DevToolsStore {
    return this.store;
  }

  /**
   * Middleware name
   */
  get name(): string {
    return 'devtools';
  }

  /**
   * Process outgoing request
   */
  async onRequest(context: MiddlewareContext): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const message = context.request;

    // Apply filter
    if (!this.config.filter(message)) {
      return;
    }

    // Record request
    const requestRecord: RecordedMessage = {
      recordId: this.generateRecordId(),
      direction: MessageDirection.REQUEST,
      status: MessageStatus.PENDING,
      message,
      timestamp: Date.now(),
    };

    this.store.addMessage(requestRecord);
    this.config.onMessage(requestRecord);

    // Track request timestamp for duration calculation
    if (this.config.trackPerformance) {
      this.requestTimestamps.set(message.id, Date.now());
    }
  }

  /**
   * Process incoming response
   */
  async onResponse(context: MiddlewareContext): Promise<void> {
    if (!this.config.enabled || !context.response) {
      return;
    }

    const response = context.response;
    const message = context.request;

    // Apply filter
    if (!this.config.filter(response)) {
      return;
    }

    // Calculate duration
    const duration = this.config.trackPerformance
      ? Date.now() - (this.requestTimestamps.get(message.id) ?? Date.now())
      : undefined;

    // Clean up timestamp
    this.requestTimestamps.delete(message.id);

    // Record response
    const responseRecord: RecordedMessage = {
      recordId: this.generateRecordId(),
      direction: MessageDirection.RESPONSE,
      status: response.success ? MessageStatus.SUCCESS : MessageStatus.ERROR,
      message: response,
      timestamp: Date.now(),
      duration,
    };

    this.store.addMessage(responseRecord);
    this.config.onMessage(responseRecord);
  }

  /**
   * Process error
   */
  async onError(context: MiddlewareContext, error: Error): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const message = context.request;

    // Calculate duration
    const duration = this.config.trackPerformance
      ? Date.now() - (this.requestTimestamps.get(message.id) ?? Date.now())
      : undefined;

    // Clean up timestamp
    this.requestTimestamps.delete(message.id);

    // Record error
    const errorRecord: RecordedMessage = {
      recordId: this.generateRecordId(),
      direction: MessageDirection.RESPONSE,
      status: MessageStatus.ERROR,
      message: {
        id: message.id,
        success: false,
        error: {
          code: 'MIDDLEWARE_ERROR',
          message: error.message,
        },
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
      duration,
      stackTrace: this.config.captureStackTraces ? error.stack : undefined,
    };

    this.store.addMessage(errorRecord);
    this.config.onMessage(errorRecord);
  }

  /**
   * Clear all recorded messages
   */
  clear(): void {
    this.store.clear();
    this.requestTimestamps.clear();
  }

  /**
   * Enable/disable recording
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Check if recording is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Generate unique record ID
   */
  private generateRecordId(): string {
    return `record-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Create DevTools middleware
 */
export function createDevToolsMiddleware(
  config?: DevToolsConfig,
  store?: DevToolsStore
): DevToolsMiddleware {
  return new DevToolsMiddleware(config, store);
}

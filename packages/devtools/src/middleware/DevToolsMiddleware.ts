/**
 * DevToolsMiddleware — Records all bridge messages for debugging/visualization.
 * Uses the onion model: records request before next(), response/error after.
 */

import type { Middleware, MiddlewareFn } from '@ts-bridge/shared';
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

export class DevToolsMiddleware {
  private config: Required<DevToolsConfig>;
  private store: DevToolsStore;

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
  }

  /** Get the named middleware object for bridge.use() */
  toMiddleware(): Middleware {
    return { name: 'devtools', fn: this.createFn() };
  }

  /** Shorthand — name property for backward compat */
  get name(): string {
    return 'devtools';
  }

  /** Shorthand — fn property for backward compat */
  get fn(): MiddlewareFn {
    return this.createFn();
  }

  getStore(): DevToolsStore {
    return this.store;
  }

  clear(): void {
    this.store.clear();
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  private createFn(): MiddlewareFn {
    return async (ctx, next) => {
      if (!this.config.enabled) {
        return next();
      }

      const message = ctx.request;

      if (!this.config.filter(message)) {
        return next();
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

      const startTime = Date.now();

      try {
        await next();

        // Record response
        if (ctx.response) {
          const duration = this.config.trackPerformance
            ? Date.now() - startTime
            : undefined;

          const responseRecord: RecordedMessage = {
            recordId: this.generateRecordId(),
            direction: MessageDirection.RESPONSE,
            status: ctx.response.success ? MessageStatus.SUCCESS : MessageStatus.ERROR,
            message: ctx.response,
            timestamp: Date.now(),
            duration,
          };

          this.store.addMessage(responseRecord);
          this.config.onMessage(responseRecord);
        }
      } catch (error) {
        // Record error
        const duration = this.config.trackPerformance
          ? Date.now() - startTime
          : undefined;

        const errorRecord: RecordedMessage = {
          recordId: this.generateRecordId(),
          direction: MessageDirection.RESPONSE,
          status: MessageStatus.ERROR,
          message: {
            id: message.id,
            success: false,
            error: {
              code: 'MIDDLEWARE_ERROR',
              message: (error as Error).message,
            },
            timestamp: Date.now(),
          },
          timestamp: Date.now(),
          duration,
          stackTrace: this.config.captureStackTraces ? (error as Error).stack : undefined,
        };

        this.store.addMessage(errorRecord);
        this.config.onMessage(errorRecord);

        throw error;
      }
    };
  }

  private generateRecordId(): string {
    return `record-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

export function createDevToolsMiddleware(
  config?: DevToolsConfig,
  store?: DevToolsStore
): DevToolsMiddleware {
  return new DevToolsMiddleware(config, store);
}

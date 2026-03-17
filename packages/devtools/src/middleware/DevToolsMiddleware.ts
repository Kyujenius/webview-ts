/**
 * DevToolsMiddleware — Records all bridge calls for debugging/visualization.
 * One record per call: PENDING → SUCCESS/ERROR.
 */

import { METADATA_KEYS } from '@webview-ts/shared';
import type { Middleware, MiddlewareFn } from '@webview-ts/shared';
import type { DevToolsConfig, RecordedMessage, DevToolsStore } from '../types/index';
import type { DevToolsTransport } from '../transport/DevToolsTransport';
import { DevToolsStoreImpl } from '../logger/DevToolsStore';

type ResolvedConfig = Omit<Required<DevToolsConfig>, 'transport'> & {
  transport?: DevToolsTransport;
};

export class DevToolsMiddleware {
  private config: ResolvedConfig;
  private store: DevToolsStore;

  constructor(config: DevToolsConfig = {}, store?: DevToolsStore) {
    this.config = {
      enabled: config.enabled ?? true,
      maxRecords: config.maxRecords ?? 1000,
      trackPerformance: config.trackPerformance ?? true,
      captureStackTraces: config.captureStackTraces ?? true,
      filter: config.filter ?? (() => true),
      onMessage: config.onMessage ?? (() => {}),
      transport: config.transport,
      debug: config.debug ?? false,
    };

    this.store = store ?? new DevToolsStoreImpl(this.config.maxRecords);
  }

  toMiddleware(): Middleware {
    return { name: 'devtools', fn: this.createFn(), __skipTrace: true } as Middleware;
  }

  get name(): string {
    return 'devtools';
  }

  get fn(): MiddlewareFn {
    return this.createFn();
  }

  get __skipTrace(): boolean {
    return true;
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

      const { request } = ctx;

      if (!this.config.filter(request)) {
        return next();
      }

      // Create a single record for this call lifecycle
      const record: RecordedMessage = {
        recordId: this.generateRecordId(),
        status: 'pending',
        action: request.action,
        payload: request.payload,
        timestamp: Date.now(),
      };

      this.store.addMessage(record);
      this.config.onMessage(record);
      this.config.transport?.send({ type: 'record', record: { ...record } });
      if (this.config.debug) console.log(`[devtools] → ${record.action} (pending)`);

      const startTime = Date.now();

      try {
        await next();

        const duration = this.config.trackPerformance ? Date.now() - startTime : undefined;
        const middlewareTrace = ctx.metadata.get(
          METADATA_KEYS.MW_TRACES
        ) as RecordedMessage['middlewareTrace'];
        const handlerMs = ctx.metadata.get(METADATA_KEYS.HANDLER_MS) as number | undefined;
        const handlerSkipped = ctx.metadata.get(METADATA_KEYS.HANDLER_SKIPPED) as
          | boolean
          | undefined;

        const updates: Partial<RecordedMessage> = {
          status: ctx.response?.success ? 'success' : 'error',
          duration,
          middlewareTrace,
          handlerMs,
          handlerSkipped,
        };

        if (ctx.response?.success) {
          updates.responseData = ctx.response.data;
        } else if (ctx.response) {
          updates.error = ctx.response.error as RecordedMessage['error'];
        }

        this.store.updateMessage(record.recordId, updates);
        Object.assign(record, updates);
        this.config.onMessage(record);
        this.config.transport?.send({ type: 'record', record: { ...record } });
        if (this.config.debug)
          console.log(
            `[devtools] ← ${record.action} (${updates.status} ${duration?.toFixed(0)}ms)`
          );
      } catch (error) {
        const duration = this.config.trackPerformance ? Date.now() - startTime : undefined;
        const middlewareTrace = ctx.metadata.get(
          METADATA_KEYS.MW_TRACES
        ) as RecordedMessage['middlewareTrace'];
        const handlerMs = ctx.metadata.get(METADATA_KEYS.HANDLER_MS) as number | undefined;
        const handlerSkipped = ctx.metadata.get(METADATA_KEYS.HANDLER_SKIPPED) as
          | boolean
          | undefined;

        const updates: Partial<RecordedMessage> = {
          status: 'error',
          duration,
          error: {
            code: 'MIDDLEWARE_ERROR',
            message: (error as Error).message,
          },
          stackTrace: this.config.captureStackTraces ? (error as Error).stack : undefined,
          middlewareTrace,
          handlerMs,
          handlerSkipped,
        };

        this.store.updateMessage(record.recordId, updates);
        Object.assign(record, updates);
        this.config.onMessage(record);
        this.config.transport?.send({ type: 'record', record: { ...record } });
        if (this.config.debug)
          console.log(`[devtools] ✗ ${record.action} (error: ${(error as Error).message})`);

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

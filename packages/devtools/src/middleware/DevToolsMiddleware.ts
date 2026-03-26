/**
 * DevToolsMiddleware — Records all bridge calls for debugging/visualization.
 * Subscribes to lifecycle events: call:start, call:end, call:error.
 */

import { DevToolsStoreImpl } from '../logger/DevToolsStore';
import type { DevToolsTransport } from '../transport/DevToolsTransport';
import type { DevToolsConfig, DevToolsStore, RecordedMessage } from '../types/index';

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

  connect(target: { onCall(event: string, handler: (data: any) => void): () => void }): () => void {
    const unsubs: (() => void)[] = [];

    unsubs.push(
      target.onCall(
        'call:start',
        (data: { id: string; action: string; payload: unknown; timestamp: number }) => {
          if (!this.config.enabled) return;
          if (!this.config.filter({ action: data.action, payload: data.payload })) return;

          const record: RecordedMessage = {
            recordId: this.generateRecordId(),
            status: 'pending',
            action: data.action,
            payload: data.payload,
            timestamp: data.timestamp,
            messageId: data.id,
          };

          this.store.addMessage(record);
          this.config.onMessage(record);
          this.config.transport?.send({ type: 'record', record: { ...record } });
          if (this.config.debug) console.log(`[devtools] → ${record.action} (pending)`);
        }
      )
    );

    unsubs.push(
      target.onCall(
        'call:end',
        (data: { id: string; action: string; response: any; duration: number }) => {
          if (!this.config.enabled) return;

          const duration = this.config.trackPerformance ? data.duration : undefined;
          const status = data.response?.success ? 'success' : 'error';

          const record: RecordedMessage = {
            recordId: this.generateRecordId(),
            status,
            action: data.action,
            timestamp: Date.now(),
            duration,
            messageId: data.id,
            responseData: data.response?.success ? data.response.data : undefined,
            error: data.response && !data.response.success ? data.response.error : undefined,
          };

          this.store.addMessage(record);
          this.config.onMessage(record);
          this.config.transport?.send({ type: 'record', record: { ...record } });
          if (this.config.debug)
            console.log(`[devtools] ← ${data.action} (${status} ${duration?.toFixed(0)}ms)`);
        }
      )
    );

    unsubs.push(
      target.onCall(
        'call:error',
        (data: { id: string; action: string; error: Error; duration: number }) => {
          if (!this.config.enabled) return;

          const duration = this.config.trackPerformance ? data.duration : undefined;
          const record: RecordedMessage = {
            recordId: this.generateRecordId(),
            status: 'error',
            action: data.action,
            timestamp: Date.now(),
            duration,
            messageId: data.id,
            error: { code: 'CALL_ERROR', message: data.error.message },
            stackTrace: this.config.captureStackTraces ? data.error.stack : undefined,
          };

          this.store.addMessage(record);
          this.config.onMessage(record);
          this.config.transport?.send({ type: 'record', record: { ...record } });
          if (this.config.debug)
            console.log(`[devtools] ✗ ${data.action} (error: ${data.error.message})`);
        }
      )
    );

    return () => unsubs.forEach((fn) => fn());
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

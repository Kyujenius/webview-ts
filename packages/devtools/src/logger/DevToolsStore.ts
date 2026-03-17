/**
 * DevToolsStore - Stores and manages recorded messages
 */

import type { DevToolsStore, RecordedMessage, PerformanceMetrics } from '../types/index';

/**
 * In-memory store for DevTools messages
 */
export class DevToolsStoreImpl implements DevToolsStore {
  private messages: RecordedMessage[];
  private messageMap: Map<string, RecordedMessage>;
  private maxRecords: number;

  constructor(maxRecords: number = 1000) {
    this.messages = [];
    this.messageMap = new Map();
    this.maxRecords = maxRecords;
  }

  addMessage(record: RecordedMessage): void {
    this.messages.push(record);
    this.messageMap.set(record.recordId, record);

    if (this.messages.length > this.maxRecords) {
      const removed = this.messages.shift();
      if (removed) {
        this.messageMap.delete(removed.recordId);
      }
    }
  }

  updateMessage(recordId: string, updates: Partial<RecordedMessage>): void {
    const record = this.messageMap.get(recordId);
    if (record) {
      Object.assign(record, updates);
    }
  }

  getMessages(): RecordedMessage[] {
    return [...this.messages];
  }

  getMessage(recordId: string): RecordedMessage | undefined {
    return this.messageMap.get(recordId);
  }

  getMessagesByAction(action: string): RecordedMessage[] {
    return this.messages.filter((r) => r.action === action);
  }

  clear(): void {
    this.messages = [];
    this.messageMap.clear();
  }

  getMetrics(): PerformanceMetrics {
    let errorCount = 0;
    let timeoutCount = 0;

    for (const record of this.messages) {
      if (record.status === 'error') {
        errorCount++;
      } else if (record.status === 'timeout') {
        timeoutCount++;
      }
    }

    return {
      totalMessages: this.messages.length,
      errorCount,
      timeoutCount,
    };
  }

  export(): string {
    return JSON.stringify(
      {
        version: '2.0',
        timestamp: Date.now(),
        messages: this.messages,
        metrics: this.getMetrics(),
      },
      null,
      2
    );
  }

  import(data: string): void {
    try {
      const parsed = JSON.parse(data);

      if (!parsed.version || !Array.isArray(parsed.messages)) {
        throw new Error('Invalid export format');
      }

      this.clear();

      for (const message of parsed.messages) {
        this.addMessage(message);
      }
    } catch (error) {
      throw new Error(
        `Failed to import messages: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

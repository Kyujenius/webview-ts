/**
 * DevToolsStore - Stores and manages recorded messages
 */

import type { DevToolsStore, RecordedMessage, PerformanceMetrics } from '../types/index';
import { MessageStatus } from '../types/index';

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

  /**
   * Add a new message
   */
  addMessage(record: RecordedMessage): void {
    // Add to list
    this.messages.push(record);

    // Add to map
    this.messageMap.set(record.recordId, record);

    // Trim if exceeded max
    if (this.messages.length > this.maxRecords) {
      const removed = this.messages.shift();
      if (removed) {
        this.messageMap.delete(removed.recordId);
      }
    }
  }

  /**
   * Get all recorded messages
   */
  getMessages(): RecordedMessage[] {
    return [...this.messages];
  }

  /**
   * Get message by record ID
   */
  getMessage(recordId: string): RecordedMessage | undefined {
    return this.messageMap.get(recordId);
  }

  /**
   * Get messages by message ID (matches request/response pairs)
   */
  getMessagesByMessageId(messageId: string): RecordedMessage[] {
    return this.messages.filter((record) => {
      if ('id' in record.message) {
        return record.message.id === messageId;
      }
      return false;
    });
  }

  /**
   * Clear all recorded messages
   */
  clear(): void {
    this.messages = [];
    this.messageMap.clear();
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const responseTimes: number[] = [];
    let errorCount = 0;
    let timeoutCount = 0;
    let successCount = 0;

    for (const record of this.messages) {
      // Count statuses
      if (record.status === MessageStatus.SUCCESS) {
        successCount++;
      } else if (record.status === MessageStatus.ERROR) {
        errorCount++;
      } else if (record.status === MessageStatus.TIMEOUT) {
        timeoutCount++;
      }

      // Collect response times
      if (record.duration !== undefined) {
        responseTimes.push(record.duration);
      }
    }

    const totalMessages = this.messages.length;
    const totalResponses = successCount + errorCount + timeoutCount;

    return {
      totalMessages,
      averageResponseTime:
        responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      successRate: totalResponses > 0 ? successCount / totalResponses : 0,
      errorCount,
      timeoutCount,
    };
  }

  /**
   * Export messages as JSON
   */
  export(): string {
    return JSON.stringify(
      {
        version: '1.0',
        timestamp: Date.now(),
        messages: this.messages,
        metrics: this.getMetrics(),
      },
      null,
      2
    );
  }

  /**
   * Import messages from JSON
   */
  import(data: string): void {
    try {
      const parsed = JSON.parse(data);

      if (!parsed.version || !Array.isArray(parsed.messages)) {
        throw new Error('Invalid export format');
      }

      // Clear existing messages
      this.clear();

      // Import messages
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

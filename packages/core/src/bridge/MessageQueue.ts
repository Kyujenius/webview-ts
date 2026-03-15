/**
 * Queue for managing bridge message requests
 */

import type { BridgeMessage } from '@webview-ts/shared';

/**
 * Queue entry
 */
interface QueueEntry {
  message: BridgeMessage;
  timestamp: number;
}

/**
 * Manages message queue with deduplication
 */
export class MessageQueue {
  private queue: QueueEntry[] = [];
  private inFlight = new Set<string>();
  private enableDeduplication: boolean;
  private maxSize: number;

  constructor(options: { enableDeduplication?: boolean; maxSize?: number } = {}) {
    this.enableDeduplication = options.enableDeduplication ?? true;
    this.maxSize = options.maxSize ?? 100;
  }

  /**
   * Add message to queue
   * Returns false if message is duplicate and deduplication is enabled
   */
  enqueue(message: BridgeMessage): boolean {
    // Check for duplicates if enabled
    if (this.enableDeduplication && this.isDuplicate(message)) {
      return false;
    }

    // Check max size
    if (this.queue.length >= this.maxSize) {
      throw new Error(`Message queue full (max: ${this.maxSize})`);
    }

    this.queue.push({
      message,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Get next message from queue
   */
  dequeue(): BridgeMessage | undefined {
    const entry = this.queue.shift();
    if (entry) {
      this.inFlight.add(entry.message.id);
      return entry.message;
    }
    return undefined;
  }

  /**
   * Mark message as completed
   */
  complete(messageId: string): void {
    this.inFlight.delete(messageId);
  }

  /**
   * Check if message is duplicate
   */
  private isDuplicate(message: BridgeMessage): boolean {
    // Check in-flight messages
    if (this.inFlight.has(message.id)) {
      return true;
    }

    // Check queue for same action and payload
    return this.queue.some(
      (entry) =>
        entry.message.action === message.action &&
        JSON.stringify(entry.message.payload) === JSON.stringify(message.payload)
    );
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Get number of in-flight messages
   */
  inFlightCount(): number {
    return this.inFlight.size;
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
    this.inFlight.clear();
  }

  /**
   * Get all message IDs in queue
   */
  getQueuedIds(): string[] {
    return this.queue.map((entry) => entry.message.id);
  }
}

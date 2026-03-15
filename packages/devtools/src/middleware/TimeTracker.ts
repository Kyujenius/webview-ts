/**
 * TimeTracker - Tracks performance metrics for bridge calls
 */

import type { Middleware, MiddlewareContext } from '@ts-bridge/shared';

/**
 * Performance entry for a single request
 */
export interface PerformanceEntry {
  /**
   * Message ID
   */
  messageId: string;

  /**
   * Action name
   */
  action: string;

  /**
   * Start timestamp
   */
  startTime: number;

  /**
   * End timestamp
   */
  endTime?: number;

  /**
   * Duration in milliseconds
   */
  duration?: number;

  /**
   * Whether the request succeeded
   */
  success?: boolean;

  /**
   * Error message if failed
   */
  error?: string;
}

/**
 * Time tracker middleware
 */
export class TimeTracker implements Middleware {
  private entries: Map<string, PerformanceEntry>;
  private completedEntries: PerformanceEntry[];
  private maxEntries: number;

  constructor(maxEntries: number = 1000) {
    this.entries = new Map();
    this.completedEntries = [];
    this.maxEntries = maxEntries;
  }

  /**
   * Middleware name
   */
  get name(): string {
    return 'time-tracker';
  }

  /**
   * Track request timing
   */
  async onRequest(context: MiddlewareContext): Promise<void> {
    const message = context.request;

    // Start tracking
    const entry: PerformanceEntry = {
      messageId: message.id,
      action: message.action,
      startTime: performance.now(),
    };

    this.entries.set(message.id, entry);
  }

  /**
   * Complete tracking on response
   */
  async onResponse(context: MiddlewareContext): Promise<void> {
    const entry = this.entries.get(context.request.id);

    if (!entry || !context.response) {
      return;
    }

    // Complete tracking
    entry.endTime = performance.now();
    entry.duration = entry.endTime - entry.startTime;
    entry.success = context.response.success;

    if (!context.response.success && context.response.error) {
      entry.error = context.response.error.message;
    }

    this.completeEntry(entry);
  }

  /**
   * Complete tracking on error
   */
  async onError(context: MiddlewareContext, error: Error): Promise<void> {
    const entry = this.entries.get(context.request.id);

    if (!entry) {
      return;
    }

    // Complete tracking with error
    entry.endTime = performance.now();
    entry.duration = entry.endTime - entry.startTime;
    entry.success = false;
    entry.error = error.message;

    this.completeEntry(entry);
  }

  /**
   * Complete an entry and move to completed list
   */
  private completeEntry(entry: PerformanceEntry): void {
    this.entries.delete(entry.messageId);
    this.completedEntries.push(entry);

    // Trim if exceeded max
    if (this.completedEntries.length > this.maxEntries) {
      this.completedEntries.shift();
    }
  }

  /**
   * Get all completed entries
   */
  getEntries(): PerformanceEntry[] {
    return [...this.completedEntries];
  }

  /**
   * Get entries by action
   */
  getEntriesByAction(action: string): PerformanceEntry[] {
    return this.completedEntries.filter((entry) => entry.action === action);
  }

  /**
   * Get average duration for an action
   */
  getAverageDuration(action?: string): number {
    const entries = action
      ? this.getEntriesByAction(action)
      : this.completedEntries;

    const durations = entries
      .filter((entry) => entry.duration !== undefined)
      .map((entry) => entry.duration!);

    if (durations.length === 0) {
      return 0;
    }

    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }

  /**
   * Get success rate for an action
   */
  getSuccessRate(action?: string): number {
    const entries = action
      ? this.getEntriesByAction(action)
      : this.completedEntries;

    if (entries.length === 0) {
      return 0;
    }

    const successCount = entries.filter((entry) => entry.success).length;
    return successCount / entries.length;
  }

  /**
   * Get pending entries (requests that haven't completed)
   */
  getPendingEntries(): PerformanceEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
    this.completedEntries = [];
  }

  /**
   * Export entries as JSON
   */
  export(): string {
    return JSON.stringify(
      {
        version: '1.0',
        timestamp: Date.now(),
        entries: this.completedEntries,
        pending: Array.from(this.entries.values()),
      },
      null,
      2
    );
  }
}

/**
 * Create time tracker middleware
 */
export function createTimeTracker(maxEntries?: number): TimeTracker {
  return new TimeTracker(maxEntries);
}

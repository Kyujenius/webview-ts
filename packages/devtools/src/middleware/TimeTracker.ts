/**
 * TimeTracker — Performance tracking middleware using the onion model.
 * Timing is natural: start before next(), end after next().
 */

import type { Middleware, MiddlewareFn } from '@ts-bridge/shared';

export interface PerformanceEntry {
  messageId: string;
  action: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success?: boolean;
  error?: string;
}

export class TimeTracker {
  private entries: Map<string, PerformanceEntry> = new Map();
  private completedEntries: PerformanceEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries: number = 1000) {
    this.maxEntries = maxEntries;
  }

  get name(): string {
    return 'time-tracker';
  }

  get fn(): MiddlewareFn {
    return this.createFn();
  }

  toMiddleware(): Middleware {
    return { name: this.name, fn: this.createFn() };
  }

  private createFn(): MiddlewareFn {
    return async (ctx, next) => {
      const entry: PerformanceEntry = {
        messageId: ctx.request.id,
        action: ctx.request.action,
        startTime: performance.now(),
      };

      this.entries.set(ctx.request.id, entry);

      try {
        await next();

        entry.endTime = performance.now();
        entry.duration = entry.endTime - entry.startTime;
        entry.success = ctx.response?.success ?? true;

        if (ctx.response && !ctx.response.success && ctx.response.error) {
          entry.error = ctx.response.error.message;
        }
      } catch (error) {
        entry.endTime = performance.now();
        entry.duration = entry.endTime - entry.startTime;
        entry.success = false;
        entry.error = (error as Error).message;
        throw error;
      } finally {
        this.completeEntry(entry);
      }
    };
  }

  private completeEntry(entry: PerformanceEntry): void {
    this.entries.delete(entry.messageId);
    this.completedEntries.push(entry);

    if (this.completedEntries.length > this.maxEntries) {
      this.completedEntries.shift();
    }
  }

  getEntries(): PerformanceEntry[] {
    return [...this.completedEntries];
  }

  getEntriesByAction(action: string): PerformanceEntry[] {
    return this.completedEntries.filter((e) => e.action === action);
  }

  getAverageDuration(action?: string): number {
    const entries = action ? this.getEntriesByAction(action) : this.completedEntries;
    const durations = entries.filter((e) => e.duration !== undefined).map((e) => e.duration!);

    if (durations.length === 0) return 0;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }

  getSuccessRate(action?: string): number {
    const entries = action ? this.getEntriesByAction(action) : this.completedEntries;
    if (entries.length === 0) return 0;
    return entries.filter((e) => e.success).length / entries.length;
  }

  getPendingEntries(): PerformanceEntry[] {
    return Array.from(this.entries.values());
  }

  clear(): void {
    this.entries.clear();
    this.completedEntries = [];
  }

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

export function createTimeTracker(maxEntries?: number): TimeTracker {
  return new TimeTracker(maxEntries);
}

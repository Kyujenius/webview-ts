/**
 * TimeTracker — Performance tracking via lifecycle event subscription.
 * Subscribes to call:start, call:end, call:error events.
 */

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

  connect(target: { onCall(event: string, handler: (data: any) => void): () => void }): () => void {
    const unsubs: (() => void)[] = [];

    unsubs.push(
      target.onCall('call:start', (data: { id: string; action: string }) => {
        const entry: PerformanceEntry = {
          messageId: data.id,
          action: data.action,
          startTime: performance.now(),
        };
        this.entries.set(data.id, entry);
      })
    );

    unsubs.push(
      target.onCall('call:end', (data: { id: string; response: any }) => {
        const entry = this.entries.get(data.id);
        if (!entry) return;
        entry.endTime = performance.now();
        entry.duration = entry.endTime - entry.startTime;
        entry.success = data.response?.success ?? true;
        if (data.response && !data.response.success && data.response.error) {
          entry.error = data.response.error.message;
        }
        this.completeEntry(entry);
      })
    );

    unsubs.push(
      target.onCall('call:error', (data: { id: string; error: Error }) => {
        const entry = this.entries.get(data.id);
        if (!entry) return;
        entry.endTime = performance.now();
        entry.duration = entry.endTime - entry.startTime;
        entry.success = false;
        entry.error = data.error.message;
        this.completeEntry(entry);
      })
    );

    return () => unsubs.forEach((fn) => fn());
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

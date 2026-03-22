import { describe, it, expect, beforeEach } from 'vitest';
import { createTimeTracker, TimeTracker } from './TimeTracker';
import { MetadataMap } from '@webview-ts/shared';

function makeCtx(action = 'test.action', id = 'msg-1') {
  return {
    request: {
      id,
      action,
      payload: {},
      timestamp: Date.now(),
      sourceId: 'src',
      targetId: 'host',
    },
    startTime: Date.now(),
    metadata: new MetadataMap(),
    response: undefined as any,
  };
}

describe('TimeTracker', () => {
  let tracker: TimeTracker;

  beforeEach(() => {
    tracker = createTimeTracker();
  });

  it('createTimeTracker returns a TimeTracker instance', () => {
    expect(tracker).toBeInstanceOf(TimeTracker);
  });

  it('toMiddleware() returns middleware named "time-tracker"', () => {
    const mw = tracker.toMiddleware();
    expect(mw.name).toBe('time-tracker');
    expect(typeof mw.fn).toBe('function');
  });

  it('records a successful entry with duration', async () => {
    const ctx = makeCtx();
    await tracker.fn(ctx, async () => {
      ctx.response = { success: true } as any;
    });

    const entries = tracker.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe('test.action');
    expect(entries[0].success).toBe(true);
    expect(entries[0].duration).toBeGreaterThanOrEqual(0);
  });

  it('records an error entry and rethrows', async () => {
    const ctx = makeCtx();
    await expect(
      tracker.fn(ctx, async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    const entries = tracker.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].success).toBe(false);
    expect(entries[0].error).toBe('boom');
    expect(entries[0].duration).toBeGreaterThanOrEqual(0);
  });

  it('records response error when ctx.response.success === false', async () => {
    const ctx = makeCtx();
    await tracker.fn(ctx, async () => {
      ctx.response = {
        success: false,
        error: { message: 'response error' },
      } as any;
    });

    const entries = tracker.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].success).toBe(false);
    expect(entries[0].error).toBe('response error');
  });

  it('getEntries() returns completed entries', async () => {
    const ctx = makeCtx();
    await tracker.fn(ctx, async () => {});

    expect(tracker.getEntries()).toHaveLength(1);
  });

  it('getEntriesByAction() filters by action name', async () => {
    await tracker.fn(makeCtx('action.a', 'id-1'), async () => {});
    await tracker.fn(makeCtx('action.b', 'id-2'), async () => {});
    await tracker.fn(makeCtx('action.a', 'id-3'), async () => {});

    expect(tracker.getEntriesByAction('action.a')).toHaveLength(2);
    expect(tracker.getEntriesByAction('action.b')).toHaveLength(1);
    expect(tracker.getEntriesByAction('action.c')).toHaveLength(0);
  });

  it('getAverageDuration() computes average across all entries', async () => {
    await tracker.fn(makeCtx('a', 'id-1'), async () => {});
    await tracker.fn(makeCtx('b', 'id-2'), async () => {});

    const avg = tracker.getAverageDuration();
    expect(avg).toBeGreaterThanOrEqual(0);
  });

  it('getAverageDuration(action) filters by action', async () => {
    await tracker.fn(makeCtx('action.x', 'id-1'), async () => {});
    await tracker.fn(makeCtx('action.y', 'id-2'), async () => {});

    const avg = tracker.getAverageDuration('action.x');
    expect(avg).toBeGreaterThanOrEqual(0);
    // Only 1 entry for action.x, so avg equals that entry's duration
    const [entry] = tracker.getEntriesByAction('action.x');
    expect(avg).toBe(entry.duration);
  });

  it('getAverageDuration() returns 0 for empty entries', () => {
    expect(tracker.getAverageDuration()).toBe(0);
  });

  it('getSuccessRate() computes ratio of successful entries', async () => {
    await tracker.fn(makeCtx('a', 'id-1'), async () => {
      // no response — success defaults to true
    });
    await expect(
      tracker.fn(makeCtx('a', 'id-2'), async () => {
        throw new Error('fail');
      })
    ).rejects.toThrow();

    expect(tracker.getSuccessRate()).toBe(0.5);
  });

  it('getSuccessRate() returns 0 for empty entries', () => {
    expect(tracker.getSuccessRate()).toBe(0);
  });

  it('getPendingEntries() is empty after completion', async () => {
    await tracker.fn(makeCtx(), async () => {});
    expect(tracker.getPendingEntries()).toHaveLength(0);
  });

  it('clear() removes all entries', async () => {
    await tracker.fn(makeCtx(), async () => {});
    tracker.clear();
    expect(tracker.getEntries()).toHaveLength(0);
  });

  it('export() returns a valid JSON string with entries', async () => {
    await tracker.fn(makeCtx(), async () => {});
    const json = tracker.export();
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe('1.0');
    expect(Array.isArray(parsed.entries)).toBe(true);
    expect(parsed.entries).toHaveLength(1);
  });

  it('trims oldest entries when exceeding maxEntries', async () => {
    const small = createTimeTracker(3);

    for (let i = 0; i < 5; i++) {
      await small.fn(makeCtx('a', `id-${i}`), async () => {});
    }

    const entries = small.getEntries();
    expect(entries).toHaveLength(3);
    // oldest entries were shifted out; only the last 3 remain
    expect(entries.map((e) => e.messageId)).toEqual(['id-2', 'id-3', 'id-4']);
  });
});

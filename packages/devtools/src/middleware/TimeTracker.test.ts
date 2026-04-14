import { beforeEach, describe, expect, it } from 'vitest';

import type { TimeTracker } from './TimeTracker';
import { createTimeTracker } from './TimeTracker';

type EventHandler = (data: any) => void;

function createMockTarget() {
  const handlers: Map<string, EventHandler[]> = new Map();

  return {
    onCall(event: string, handler: EventHandler): () => void {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event)!.push(handler);
      return () => {
        const list = handlers.get(event);
        if (list) {
          const idx = list.indexOf(handler);
          if (idx >= 0) list.splice(idx, 1);
        }
      };
    },
    emit(event: string, data: any) {
      const list = handlers.get(event);
      if (list) list.forEach((h) => h(data));
    },
  };
}

describe('TimeTracker', () => {
  let tracker: TimeTracker;

  beforeEach(() => {
    tracker = createTimeTracker();
  });

  it('records a successful entry with duration via connect()', () => {
    const target = createMockTarget();
    tracker.connect(target);

    target.emit('call:start', { id: 'msg-1', action: 'test.action' });
    target.emit('call:end', { id: 'msg-1', response: { success: true } });

    const entries = tracker.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe('test.action');
    expect(entries[0].success).toBe(true);
    expect(entries[0].duration).toBeGreaterThanOrEqual(0);
  });

  it('records an error entry via call:error', () => {
    const target = createMockTarget();
    tracker.connect(target);

    target.emit('call:start', { id: 'msg-1', action: 'test.action' });
    target.emit('call:error', { id: 'msg-1', error: new Error('boom') });

    const entries = tracker.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].success).toBe(false);
    expect(entries[0].error).toBe('boom');
    expect(entries[0].duration).toBeGreaterThanOrEqual(0);
  });

  it('records response error when response.success === false', () => {
    const target = createMockTarget();
    tracker.connect(target);

    target.emit('call:start', { id: 'msg-1', action: 'test.action' });
    target.emit('call:end', {
      id: 'msg-1',
      response: { success: false, error: { message: 'response error' } },
    });

    const entries = tracker.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].success).toBe(false);
    expect(entries[0].error).toBe('response error');
  });

  it('getEntriesByAction() filters by action name', () => {
    const target = createMockTarget();
    tracker.connect(target);

    target.emit('call:start', { id: 'id-1', action: 'action.a' });
    target.emit('call:end', { id: 'id-1', response: { success: true } });
    target.emit('call:start', { id: 'id-2', action: 'action.b' });
    target.emit('call:end', { id: 'id-2', response: { success: true } });
    target.emit('call:start', { id: 'id-3', action: 'action.a' });
    target.emit('call:end', { id: 'id-3', response: { success: true } });

    expect(tracker.getEntriesByAction('action.a')).toHaveLength(2);
    expect(tracker.getEntriesByAction('action.b')).toHaveLength(1);
    expect(tracker.getEntriesByAction('action.c')).toHaveLength(0);
  });

  it('getAverageDuration() computes average across all entries', () => {
    const target = createMockTarget();
    tracker.connect(target);

    target.emit('call:start', { id: 'id-1', action: 'a' });
    target.emit('call:end', { id: 'id-1', response: { success: true } });
    target.emit('call:start', { id: 'id-2', action: 'b' });
    target.emit('call:end', { id: 'id-2', response: { success: true } });

    const avg = tracker.getAverageDuration();
    expect(avg).toBeGreaterThanOrEqual(0);
  });

  it('getAverageDuration(action) filters by action', () => {
    const target = createMockTarget();
    tracker.connect(target);

    target.emit('call:start', { id: 'id-1', action: 'action.x' });
    target.emit('call:end', { id: 'id-1', response: { success: true } });
    target.emit('call:start', { id: 'id-2', action: 'action.y' });
    target.emit('call:end', { id: 'id-2', response: { success: true } });

    const avg = tracker.getAverageDuration('action.x');
    const [entry] = tracker.getEntriesByAction('action.x');
    expect(avg).toBe(entry.duration);
  });

  it('getAverageDuration() returns 0 for empty entries', () => {
    expect(tracker.getAverageDuration()).toBe(0);
  });

  it('getSuccessRate() computes ratio of successful entries', () => {
    const target = createMockTarget();
    tracker.connect(target);

    target.emit('call:start', { id: 'id-1', action: 'a' });
    target.emit('call:end', { id: 'id-1', response: { success: true } });
    target.emit('call:start', { id: 'id-2', action: 'a' });
    target.emit('call:error', { id: 'id-2', error: new Error('fail') });

    expect(tracker.getSuccessRate()).toBe(0.5);
  });

  it('getSuccessRate() returns 0 for empty entries', () => {
    expect(tracker.getSuccessRate()).toBe(0);
  });

  it('getPendingEntries() is empty after completion', () => {
    const target = createMockTarget();
    tracker.connect(target);

    target.emit('call:start', { id: 'msg-1', action: 'test.action' });
    target.emit('call:end', { id: 'msg-1', response: { success: true } });

    expect(tracker.getPendingEntries()).toHaveLength(0);
  });

  it('clear() removes all entries', () => {
    const target = createMockTarget();
    tracker.connect(target);

    target.emit('call:start', { id: 'msg-1', action: 'test.action' });
    target.emit('call:end', { id: 'msg-1', response: { success: true } });

    tracker.clear();
    expect(tracker.getEntries()).toHaveLength(0);
  });

  it('export() returns a valid JSON string with entries', () => {
    const target = createMockTarget();
    tracker.connect(target);

    target.emit('call:start', { id: 'msg-1', action: 'test.action' });
    target.emit('call:end', { id: 'msg-1', response: { success: true } });

    const json = tracker.export();
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe('1.0');
    expect(parsed.entries).toHaveLength(1);
  });

  it('trims oldest entries when exceeding maxEntries', () => {
    const small = createTimeTracker(3);
    const target = createMockTarget();
    small.connect(target);

    for (let i = 0; i < 5; i++) {
      target.emit('call:start', { id: `id-${i}`, action: 'a' });
      target.emit('call:end', { id: `id-${i}`, response: { success: true } });
    }

    const entries = small.getEntries();
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.messageId)).toEqual(['id-2', 'id-3', 'id-4']);
  });

  it('connect() returns a cleanup function that unsubscribes', () => {
    const target = createMockTarget();
    const cleanup = tracker.connect(target);

    target.emit('call:start', { id: 'msg-1', action: 'test.action' });
    target.emit('call:end', { id: 'msg-1', response: { success: true } });
    expect(tracker.getEntries()).toHaveLength(1);

    cleanup();

    // After cleanup, events should not be recorded
    target.emit('call:start', { id: 'msg-2', action: 'test.action' });
    target.emit('call:end', { id: 'msg-2', response: { success: true } });
    expect(tracker.getEntries()).toHaveLength(1);
  });
});

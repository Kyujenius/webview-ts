import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Middleware } from '../types/middleware';
import { tryAutoDevTools, _resetAutoDevTools, type AutoDevToolsTarget } from './auto-devtools';

// --- Mock WebSocket ---

type WSHandler = (...args: unknown[]) => void;

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readyState = MockWebSocket.OPEN;
  onopen: WSHandler | null = null;
  onclose: WSHandler | null = null;
  onerror: WSHandler | null = null;
  url: string;
  sent: string[] = [];
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    // Simulate async open
    queueMicrotask(() => this.onopen?.({} as Event));
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.closed = true;
    this.readyState = MockWebSocket.CLOSED;
    queueMicrotask(() => this.onclose?.({} as CloseEvent));
  }
}

function createTarget(): AutoDevToolsTarget & {
  prepended: Middleware[];
  removed: string[];
  eventHandlers: Array<(event: string, payload: unknown) => void>;
} {
  const eventHandlers: Array<(event: string, payload: unknown) => void> = [];
  return {
    prepended: [],
    removed: [],
    eventHandlers,
    prepend(mw: Middleware) {
      this.prepended.push(mw);
    },
    removeMiddleware(name: string) {
      this.removed.push(name);
      return true;
    },
    onAnyEvent(handler: (event: string, payload: unknown) => void) {
      eventHandlers.push(handler);
      return () => {
        const idx = eventHandlers.indexOf(handler);
        if (idx >= 0) eventHandlers.splice(idx, 1);
      };
    },
  };
}

describe('auto-devtools — Strict Mode & race conditions', () => {
  const originalEnv = process.env.NODE_ENV;
  let originalWebSocket: typeof globalThis.WebSocket;

  beforeEach(() => {
    MockWebSocket.instances = [];
    originalWebSocket = globalThis.WebSocket;
    (globalThis as any).WebSocket = MockWebSocket;
    process.env.NODE_ENV = 'development';
    _resetAutoDevTools();
  });

  afterEach(() => {
    _resetAutoDevTools();
    process.env.NODE_ENV = originalEnv;
    globalThis.WebSocket = originalWebSocket;
  });

  describe('Strict Mode: cleanup → re-register cycle', () => {
    it('single target: cleanup then re-register creates new WS and works', async () => {
      const target = createTarget();

      // Mount
      const cleanup1 = tryAutoDevTools(target)!;
      await new Promise<void>((r) => queueMicrotask(r));
      expect(target.prepended).toHaveLength(1);

      // Strict Mode cleanup — removes target, closes WS
      cleanup1();
      await new Promise<void>((r) => queueMicrotask(r));

      // Re-mount — should create a new WS
      const cleanup2 = tryAutoDevTools(target)!;
      expect(MockWebSocket.instances).toHaveLength(2);

      await new Promise<void>((r) => queueMicrotask(r));
      // Should get middleware again from the new WS onopen
      expect(target.prepended).toHaveLength(2);
      expect(cleanup2).toBeTypeOf('function');

      cleanup2();
    });

    it('stale onclose from old WS does not destroy new WS reference', async () => {
      const target = createTarget();

      // Mount — WS1 created
      const cleanup1 = tryAutoDevTools(target)!;
      const ws1 = MockWebSocket.instances[0];
      await new Promise<void>((r) => queueMicrotask(r));

      // Strict Mode cleanup — closes WS1
      cleanup1();
      // WS1.close() is called but onclose hasn't fired yet (async)

      // Re-mount — WS2 created (before WS1.onclose fires)
      const cleanup2 = tryAutoDevTools(target)!;
      const ws2 = MockWebSocket.instances[1];
      expect(ws2).not.toBe(ws1);

      // Now WS1.onclose fires (stale)
      await new Promise<void>((r) => queueMicrotask(r));

      // WS2.onopen should still fire and middleware should be added
      await new Promise<void>((r) => queueMicrotask(r));
      // The last prepend should be from WS2
      const lastPrepended = target.prepended[target.prepended.length - 1];
      expect(lastPrepended.name).toBe('__auto_devtools');

      cleanup2();
    });

    it('stale onopen from old WS is ignored after replacement', async () => {
      const target = createTarget();

      // Create WS1 but delay its onopen
      const originalQueueMicrotask = globalThis.queueMicrotask;
      const pendingCallbacks: Array<() => void> = [];
      globalThis.queueMicrotask = (cb: () => void) => pendingCallbacks.push(cb);

      tryAutoDevTools(target);
      const ws1 = MockWebSocket.instances[0];

      // Before WS1.onopen fires, close it and create WS2
      ws1.readyState = MockWebSocket.CLOSED;
      globalThis.queueMicrotask = originalQueueMicrotask;

      _resetAutoDevTools();
      const cleanup2 = tryAutoDevTools(target)!;
      await new Promise<void>((r) => queueMicrotask(r));

      // Now flush WS1's pending onopen — it should be a no-op
      const prependedBefore = target.prepended.length;
      for (const cb of pendingCallbacks) cb();
      // WS1's onopen should NOT prepend middleware (stale guard)
      expect(target.prepended.length).toBe(prependedBefore);

      cleanup2();
    });
  });

  describe('event recording — no duplicates', () => {
    it('single event subscription after cleanup/re-register cycle', async () => {
      const target = createTarget();

      const cleanup1 = tryAutoDevTools(target)!;
      await new Promise<void>((r) => queueMicrotask(r));
      expect(target.eventHandlers).toHaveLength(1);

      // Strict Mode cleanup
      cleanup1();
      expect(target.eventHandlers).toHaveLength(0);

      // Re-mount
      const cleanup2 = tryAutoDevTools(target)!;
      await new Promise<void>((r) => queueMicrotask(r));
      // Should have exactly 1 handler, not 2
      expect(target.eventHandlers).toHaveLength(1);

      cleanup2();
    });

    it('event records are sent exactly once per event', async () => {
      const target = createTarget();

      const cleanup1 = tryAutoDevTools(target)!;
      await new Promise<void>((r) => queueMicrotask(r));
      cleanup1();
      await new Promise<void>((r) => queueMicrotask(r));

      const cleanup2 = tryAutoDevTools(target)!;
      await new Promise<void>((r) => queueMicrotask(r));

      const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1];
      ws.sent = []; // clear any setup messages

      // Fire an event
      target.eventHandlers[0]('test.event', { value: 42 });

      expect(ws.sent).toHaveLength(1);
      const record = JSON.parse(ws.sent[0]);
      expect(record.record.status).toBe('event');
      expect(record.record.action).toBe('test.event');

      cleanup2();
    });

    it('event source is correctly inverted (client records host events)', async () => {
      const target = createTarget();
      tryAutoDevTools(target, 'client');
      await new Promise<void>((r) => queueMicrotask(r));

      const ws = MockWebSocket.instances[0];
      ws.sent = [];

      target.eventHandlers[0]('location.updated', { lat: 37 });

      const record = JSON.parse(ws.sent[0]);
      expect(record.record.source).toBe('host'); // inverted from 'client'
    });
  });

  describe('multiple targets — Strict Mode isolation', () => {
    it('cleaning up one target does not affect another', async () => {
      const target1 = createTarget();
      const target2 = createTarget();

      const cleanup1 = tryAutoDevTools(target1)!;
      const cleanup2 = tryAutoDevTools(target2)!;
      await new Promise<void>((r) => queueMicrotask(r));

      expect(target1.prepended).toHaveLength(1);
      expect(target2.prepended).toHaveLength(1);

      // Cleanup target1 only
      cleanup1();
      expect(target1.removed).toContain('__auto_devtools');
      // WS should still be open (target2 still active)
      expect(MockWebSocket.instances[0].closed).toBe(false);

      // target2's event handler should still work
      const ws = MockWebSocket.instances[0];
      ws.sent = [];
      target2.eventHandlers[0]('test.event', {});
      expect(ws.sent).toHaveLength(1);

      cleanup2();
    });

    it('re-registering same target after cleanup reuses existing WS', async () => {
      const target1 = createTarget();
      const target2 = createTarget();

      const cleanup1 = tryAutoDevTools(target1)!;
      tryAutoDevTools(target2);
      await new Promise<void>((r) => queueMicrotask(r));

      // Cleanup target1 (WS stays because target2 is still active)
      cleanup1();

      // Re-register target1 — should reuse existing WS
      const cleanup1b = tryAutoDevTools(target1)!;
      // No new WebSocket should be created
      expect(MockWebSocket.instances).toHaveLength(1);
      // target1 should get middleware immediately (wsReady is true)
      expect(target1.prepended).toHaveLength(2);

      cleanup1b();
    });
  });

  describe('sendRecord null safety', () => {
    it('sendRecord does not throw when ws is null', async () => {
      const target = createTarget();
      const cleanup = tryAutoDevTools(target)!;
      await new Promise<void>((r) => queueMicrotask(r));

      const mw = target.prepended[0];

      // Close WS so it becomes null
      cleanup();
      await new Promise<void>((r) => queueMicrotask(r));

      // The middleware closure still references the old ws,
      // but sendRecord should handle null safely
      const ctx = {
        request: { id: 'msg-1', action: 'test', timestamp: Date.now() },
        startTime: Date.now(),
        metadata: new Map(),
        response: undefined as any,
      };

      // Should not throw
      await expect(
        mw.fn(ctx, async () => {
          ctx.response = { id: 'msg-1', success: true, data: {}, timestamp: Date.now() };
        })
      ).resolves.not.toThrow();
    });
  });
});

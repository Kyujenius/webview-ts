import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';

import { _resetAutoDevTools, type AutoDevToolsTarget, tryAutoDevTools } from './auto-connect';

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

type EventHandler = (data: any) => void;

function createTarget(): AutoDevToolsTarget & {
  handlers: Map<string, EventHandler[]>;
  anyEventHandlers: Array<(event: string, payload: unknown) => void>;
  emit(event: string, data: any): void;
  getHandlerCount(event: string): number;
} {
  const handlers = new Map<string, EventHandler[]>();
  const anyEventHandlers: Array<(event: string, payload: unknown) => void> = [];
  return {
    handlers,
    anyEventHandlers,
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
    onAnyEvent(handler: (event: string, payload: unknown) => void) {
      anyEventHandlers.push(handler);
      return () => {
        const idx = anyEventHandlers.indexOf(handler);
        if (idx >= 0) anyEventHandlers.splice(idx, 1);
      };
    },
    emit(event: string, data: any) {
      const list = handlers.get(event);
      if (list) list.forEach((h) => h(data));
    },
    getHandlerCount(event: string): number {
      return handlers.get(event)?.length ?? 0;
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
      expect(target.getHandlerCount('call:start')).toBe(1);

      // Strict Mode cleanup — removes target, closes WS
      cleanup1();
      await new Promise<void>((r) => queueMicrotask(r));

      // Re-mount — should create a new WS
      const cleanup2 = tryAutoDevTools(target)!;
      expect(MockWebSocket.instances).toHaveLength(2);

      await new Promise<void>((r) => queueMicrotask(r));
      // Should get subscriptions again from the new WS onopen
      expect(target.getHandlerCount('call:start')).toBe(1);

      cleanup2();
    });

    it('stale onclose from old WS does not destroy new WS reference', async () => {
      const target = createTarget();

      // Mount — WS1 created
      const cleanup1 = tryAutoDevTools(target)!;
      await new Promise<void>((r) => queueMicrotask(r));

      // Strict Mode cleanup — closes WS1
      cleanup1();
      // WS1.close() is called but onclose hasn't fired yet (async)

      // Re-mount — WS2 created (before WS1.onclose fires)
      const cleanup2 = tryAutoDevTools(target)!;
      const ws2 = MockWebSocket.instances[1];
      expect(ws2).not.toBe(MockWebSocket.instances[0]);

      // Now WS1.onclose fires (stale)
      await new Promise<void>((r) => queueMicrotask(r));

      // WS2.onopen should still fire and subscriptions should be added
      await new Promise<void>((r) => queueMicrotask(r));
      expect(target.getHandlerCount('call:start')).toBeGreaterThanOrEqual(1);

      cleanup2();
    });

    it('stale onopen from old WS is ignored after replacement', async () => {
      const target = createTarget();

      // Create WS1 but delay its onopen
      const originalQueueMicrotask = globalThis.queueMicrotask;
      const pendingCallbacks: Array<() => void> = [];
      globalThis.queueMicrotask = (cb: () => void) => pendingCallbacks.push(cb);

      tryAutoDevTools(target);

      // Before WS1.onopen fires, close it and create WS2
      const ws1 = MockWebSocket.instances[0];
      ws1.readyState = MockWebSocket.CLOSED;
      globalThis.queueMicrotask = originalQueueMicrotask;

      _resetAutoDevTools();
      const cleanup2 = tryAutoDevTools(target)!;
      await new Promise<void>((r) => queueMicrotask(r));

      // Now flush WS1's pending onopen — it should be a no-op
      const handlerCountBefore = target.getHandlerCount('call:start');
      for (const cb of pendingCallbacks) cb();
      // WS1's onopen should NOT add subscriptions (stale guard)
      expect(target.getHandlerCount('call:start')).toBe(handlerCountBefore);

      cleanup2();
    });
  });

  describe('event recording — no duplicates', () => {
    it('single event subscription after cleanup/re-register cycle', async () => {
      const target = createTarget();

      const cleanup1 = tryAutoDevTools(target)!;
      await new Promise<void>((r) => queueMicrotask(r));
      expect(target.anyEventHandlers).toHaveLength(1);

      // Strict Mode cleanup
      cleanup1();
      expect(target.anyEventHandlers).toHaveLength(0);

      // Re-mount
      const cleanup2 = tryAutoDevTools(target)!;
      await new Promise<void>((r) => queueMicrotask(r));
      // Should have exactly 1 handler, not 2
      expect(target.anyEventHandlers).toHaveLength(1);

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
      target.anyEventHandlers[0]('test.event', { value: 42 });

      expect(ws.sent).toHaveLength(1);
      const record = JSON.parse(ws.sent[0]);
      expect(record.record.status).toBe('event');
      expect(record.record.action).toBe('test.event');

      cleanup2();
    });
  });

  describe('multiple targets — Strict Mode isolation', () => {
    it('cleaning up one target does not affect another', async () => {
      const target1 = createTarget();
      const target2 = createTarget();

      const cleanup1 = tryAutoDevTools(target1)!;
      const cleanup2 = tryAutoDevTools(target2)!;
      await new Promise<void>((r) => queueMicrotask(r));

      expect(target1.getHandlerCount('call:start')).toBe(1);
      expect(target2.getHandlerCount('call:start')).toBe(1);

      // Cleanup target1 only
      cleanup1();
      expect(target1.getHandlerCount('call:start')).toBe(0);
      // WS should still be open (target2 still active)
      expect(MockWebSocket.instances[0].closed).toBe(false);

      // target2's event handler should still work
      const ws = MockWebSocket.instances[0];
      ws.sent = [];
      target2.anyEventHandlers[0]('test.event', {});
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
      // target1 should get subscriptions immediately (wsReady is true)
      expect(target1.getHandlerCount('call:start')).toBe(1);

      cleanup1b();
    });
  });
});

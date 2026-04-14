import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { _resetAutoDevTools, type AutoDevToolsTarget, tryAutoDevTools } from './auto-devtools';

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
  emit(event: string, data: any): void;
  getHandlerCount(event: string): number;
} {
  const handlers = new Map<string, EventHandler[]>();
  return {
    handlers,
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
    getHandlerCount(event: string): number {
      return handlers.get(event)?.length ?? 0;
    },
  };
}

describe('tryAutoDevTools', () => {
  const originalEnv = process.env.NODE_ENV;
  let originalWebSocket: typeof globalThis.WebSocket;

  beforeEach(() => {
    MockWebSocket.instances = [];
    originalWebSocket = globalThis.WebSocket;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).WebSocket = MockWebSocket;
    process.env.NODE_ENV = 'development';
    _resetAutoDevTools();
  });

  afterEach(() => {
    _resetAutoDevTools();
    process.env.NODE_ENV = originalEnv;
    globalThis.WebSocket = originalWebSocket;
  });

  it('returns undefined in production', () => {
    process.env.NODE_ENV = 'production';
    const target = createTarget();
    const cleanup = tryAutoDevTools(target);
    expect(cleanup).toBeUndefined();
    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('returns undefined when WebSocket is not available', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).WebSocket = undefined;
    const target = createTarget();
    const cleanup = tryAutoDevTools(target);
    expect(cleanup).toBeUndefined();
  });

  it('connects and subscribes to events on successful connection', async () => {
    const target = createTarget();
    tryAutoDevTools(target);

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toBe('ws://localhost:4000?role=client');

    // Wait for onopen microtask
    await new Promise<void>((r) => queueMicrotask(r));

    // Should have subscribed to all three lifecycle events
    expect(target.getHandlerCount('call:start')).toBe(1);
    expect(target.getHandlerCount('call:end')).toBe(1);
    expect(target.getHandlerCount('call:error')).toBe(1);
  });

  it('shares a single WebSocket across multiple targets (singleton)', async () => {
    const target1 = createTarget();
    const target2 = createTarget();

    tryAutoDevTools(target1);
    tryAutoDevTools(target2);

    // Only one WebSocket should be created
    expect(MockWebSocket.instances).toHaveLength(1);

    await new Promise<void>((r) => queueMicrotask(r));

    // Both targets should get subscriptions
    expect(target1.getHandlerCount('call:start')).toBe(1);
    expect(target2.getHandlerCount('call:start')).toBe(1);
  });

  it('cleanup removes target and closes WS when last target removed', async () => {
    const target1 = createTarget();
    const target2 = createTarget();

    const cleanup1 = tryAutoDevTools(target1)!;
    const cleanup2 = tryAutoDevTools(target2)!;

    await new Promise<void>((r) => queueMicrotask(r));

    // Remove first target — WS stays open
    cleanup1();
    expect(target1.getHandlerCount('call:start')).toBe(0);
    expect(MockWebSocket.instances[0].closed).toBe(false);

    // Remove second target — WS closes
    cleanup2();
    expect(target2.getHandlerCount('call:start')).toBe(0);
    expect(MockWebSocket.instances[0].closed).toBe(true);
  });

  it('unsubscribes all targets when WebSocket closes unexpectedly', async () => {
    const target1 = createTarget();
    const target2 = createTarget();

    tryAutoDevTools(target1);
    tryAutoDevTools(target2);

    await new Promise<void>((r) => queueMicrotask(r));

    // Simulate unexpected close
    const ws = MockWebSocket.instances[0];
    ws.readyState = MockWebSocket.CLOSED;
    ws.onclose?.({} as CloseEvent);

    expect(target1.getHandlerCount('call:start')).toBe(0);
    expect(target2.getHandlerCount('call:start')).toBe(0);
  });

  it('late-joining target gets subscriptions immediately if WS already open', async () => {
    const target1 = createTarget();
    tryAutoDevTools(target1);

    await new Promise<void>((r) => queueMicrotask(r));
    expect(target1.getHandlerCount('call:start')).toBe(1);

    // Join after WS is already open
    const target2 = createTarget();
    tryAutoDevTools(target2);

    // Should get subscriptions immediately (no microtask needed)
    expect(target2.getHandlerCount('call:start')).toBe(1);
  });

  it('subscriptions send pending and success records', async () => {
    const target = createTarget();
    tryAutoDevTools(target);

    await new Promise<void>((r) => queueMicrotask(r));

    const ws = MockWebSocket.instances[0];

    target.emit('call:start', {
      id: 'msg-1',
      action: 'test.action',
      payload: { foo: 1 },
      timestamp: Date.now(),
    });

    expect(ws.sent).toHaveLength(1);
    const pending = JSON.parse(ws.sent[0]);
    expect(pending.type).toBe('record');
    expect(pending.record.status).toBe('pending');
    expect(pending.record.action).toBe('test.action');

    target.emit('call:end', {
      id: 'msg-1',
      action: 'test.action',
      response: { success: true, data: { bar: 2 } },
      duration: 42,
    });

    expect(ws.sent).toHaveLength(2);
    const success = JSON.parse(ws.sent[1]);
    expect(success.type).toBe('record');
    expect(success.record.status).toBe('success');
    expect(success.record.responseData).toEqual({ bar: 2 });
    expect(success.record.duration).toBe(42);
  });

  it('subscriptions send error record on call:error', async () => {
    const target = createTarget();
    tryAutoDevTools(target);

    await new Promise<void>((r) => queueMicrotask(r));

    const ws = MockWebSocket.instances[0];

    target.emit('call:error', {
      id: 'msg-2',
      action: 'test.fail',
      error: new Error('boom'),
      duration: 10,
    });

    expect(ws.sent).toHaveLength(1);
    const errorRecord = JSON.parse(ws.sent[0]);
    expect(errorRecord.record.status).toBe('error');
    expect(errorRecord.record.error.message).toBe('boom');
    expect(errorRecord.record.error.code).toBe('CALL_ERROR');
  });
});

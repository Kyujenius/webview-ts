import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MetadataMap } from '../metadata/MetadataMap';
import type { Middleware } from '../types/middleware';
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

function createTarget(): AutoDevToolsTarget & {
  prepended: Middleware[];
  removed: string[];
} {
  return {
    prepended: [],
    removed: [],
    prepend(mw: Middleware) {
      this.prepended.push(mw);
    },
    removeMiddleware(name: string) {
      this.removed.push(name);
      return true;
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

  it('connects and prepends middleware on successful connection', async () => {
    const target = createTarget();
    const cleanup = tryAutoDevTools(target);

    expect(cleanup).toBeTypeOf('function');
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toBe('ws://localhost:4000?role=client');

    // Wait for onopen microtask
    await new Promise<void>((r) => queueMicrotask(r));

    expect(target.prepended).toHaveLength(1);
    expect(target.prepended[0].name).toBe('__auto_devtools');
    expect(target.prepended[0].__skipTrace).toBe(true);
  });

  it('shares a single WebSocket across multiple targets (singleton)', async () => {
    const target1 = createTarget();
    const target2 = createTarget();

    tryAutoDevTools(target1);
    tryAutoDevTools(target2);

    // Only one WebSocket should be created
    expect(MockWebSocket.instances).toHaveLength(1);

    await new Promise<void>((r) => queueMicrotask(r));

    // Both targets should get middleware
    expect(target1.prepended).toHaveLength(1);
    expect(target2.prepended).toHaveLength(1);
  });

  it('cleanup removes target and closes WS when last target removed', async () => {
    const target1 = createTarget();
    const target2 = createTarget();

    const cleanup1 = tryAutoDevTools(target1)!;
    const cleanup2 = tryAutoDevTools(target2)!;

    await new Promise<void>((r) => queueMicrotask(r));

    // Remove first target — WS stays open
    cleanup1();
    expect(target1.removed).toContain('__auto_devtools');
    expect(MockWebSocket.instances[0].closed).toBe(false);

    // Remove second target — WS closes
    cleanup2();
    expect(target2.removed).toContain('__auto_devtools');
    expect(MockWebSocket.instances[0].closed).toBe(true);
  });

  it('removes middleware from all targets when WebSocket closes unexpectedly', async () => {
    const target1 = createTarget();
    const target2 = createTarget();

    tryAutoDevTools(target1);
    tryAutoDevTools(target2);

    await new Promise<void>((r) => queueMicrotask(r));

    // Simulate unexpected close
    const ws = MockWebSocket.instances[0];
    ws.readyState = MockWebSocket.CLOSED;
    ws.onclose?.({} as CloseEvent);

    expect(target1.removed).toContain('__auto_devtools');
    expect(target2.removed).toContain('__auto_devtools');
  });

  it('late-joining target gets middleware immediately if WS already open', async () => {
    const target1 = createTarget();
    tryAutoDevTools(target1);

    await new Promise<void>((r) => queueMicrotask(r));
    expect(target1.prepended).toHaveLength(1);

    // Join after WS is already open
    const target2 = createTarget();
    tryAutoDevTools(target2);

    // Should get middleware immediately (no microtask needed)
    expect(target2.prepended).toHaveLength(1);
  });

  it('middleware sends pending and success records', async () => {
    const target = createTarget();
    tryAutoDevTools(target);

    await new Promise<void>((r) => queueMicrotask(r));

    const mw = target.prepended[0];
    const ws = MockWebSocket.instances[0];

    const ctx = {
      request: {
        id: 'msg-1',
        sourceId: 'client-1',
        targetId: 'host',
        action: 'test.action',
        payload: { foo: 1 },
        timestamp: Date.now(),
      },
      startTime: Date.now(),
      metadata: new MetadataMap(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response: undefined as any,
    };

    await mw.fn(ctx, async () => {
      ctx.response = { id: 'msg-1', success: true, data: { bar: 2 }, timestamp: Date.now() };
    });

    expect(ws.sent).toHaveLength(2);

    const pending = JSON.parse(ws.sent[0]);
    expect(pending.type).toBe('record');
    expect(pending.record.status).toBe('pending');
    expect(pending.record.action).toBe('test.action');

    const success = JSON.parse(ws.sent[1]);
    expect(success.type).toBe('record');
    expect(success.record.status).toBe('success');
    expect(success.record.responseData).toEqual({ bar: 2 });
    expect(success.record.duration).toBeTypeOf('number');
  });

  it('middleware sends error record on failure', async () => {
    const target = createTarget();
    tryAutoDevTools(target);

    await new Promise<void>((r) => queueMicrotask(r));

    const mw = target.prepended[0];
    const ws = MockWebSocket.instances[0];

    const ctx = {
      request: {
        id: 'msg-2',
        sourceId: 'client-1',
        targetId: 'host',
        action: 'test.fail',
        timestamp: Date.now(),
      },
      startTime: Date.now(),
      metadata: new MetadataMap(),
    };

    await expect(
      mw.fn(ctx, async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    expect(ws.sent).toHaveLength(2);

    const errorRecord = JSON.parse(ws.sent[1]);
    expect(errorRecord.record.status).toBe('error');
    expect(errorRecord.record.error.message).toBe('boom');
    expect(errorRecord.record.error.code).toBe('MIDDLEWARE_ERROR');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketTransport } from '../WebSocketTransport';

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];
  url: string;

  constructor(url: string) {
    this.url = url;
    // Use setTimeout so the transport can assign handlers before onopen fires
    setTimeout(() => this.onopen?.(), 0);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('WebSocket', MockWebSocket);
});

afterEach(() => {
  vi.useRealTimers();
});

/** Create a transport and flush the initial onopen timer */
function createTransport(config?: ConstructorParameters<typeof WebSocketTransport>[0]) {
  const t = new WebSocketTransport({ port: 4000, ...config });
  vi.runAllTimers(); // flush setTimeout(onopen, 0)
  return t;
}

describe('WebSocketTransport', () => {
  it('sends serialized messages', () => {
    const t = createTransport();
    t.send({ type: 'clear' });

    const ws = (t as any).ws as MockWebSocket;
    expect(ws.sent).toContain(JSON.stringify({ type: 'clear' }));
  });

  it('receives and deserializes messages', () => {
    const t = createTransport();
    const handler = vi.fn();
    t.onMessage(handler);

    const ws = (t as any).ws as MockWebSocket;
    ws.onmessage?.({ data: JSON.stringify({ type: 'clear' }) });

    expect(handler).toHaveBeenCalledWith({ type: 'clear' });
  });

  it('fires onDisconnect when socket closes', () => {
    const t = createTransport();
    const handler = vi.fn();
    t.onDisconnect(handler);

    const ws = (t as any).ws as MockWebSocket;
    ws.close();

    expect(handler).toHaveBeenCalled();
  });

  it('connected reflects ws readyState', () => {
    const t = createTransport();
    expect(t.connected).toBe(true);

    const ws = (t as any).ws as MockWebSocket;
    ws.readyState = MockWebSocket.CLOSED;
    expect(t.connected).toBe(false);
  });

  it('ignores malformed messages', () => {
    const t = createTransport();
    const handler = vi.fn();
    t.onMessage(handler);

    const ws = (t as any).ws as MockWebSocket;
    ws.onmessage?.({ data: 'not-json{{{' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not send when socket is closed', () => {
    const t = createTransport();
    const ws = (t as any).ws as MockWebSocket;
    ws.readyState = MockWebSocket.CLOSED;

    t.send({ type: 'clear' });
    expect(ws.sent).toHaveLength(0);
  });

  it('should fire disconnect handler only once during reconnection attempts', () => {
    const t = createTransport({ reconnectInterval: 100 });

    const handler = vi.fn();
    t.onDisconnect(handler);

    // Capture the connected ws before closing
    const ws1 = (t as any).ws as MockWebSocket;

    // First close: connected → disconnected, should fire handler
    ws1.onclose?.();
    expect(handler).toHaveBeenCalledTimes(1);

    // Trigger reconnect timer → creates new WebSocket, but DON'T flush onopen timer
    vi.advanceTimersByTime(100);

    // The new socket failed to connect (onclose fires without onopen ever firing)
    // Get reference to the new socket created by connect()
    // Since onopen hasn't fired, (t as any).ws is null, but connect() created a local ws
    // Simulate: calling onclose again (e.g. from the old socket or a failed reconnect)
    // This is the bug: onclose fires disconnect handlers even when not connected
    ws1.onclose?.();

    expect(handler).toHaveBeenCalledTimes(1);

    t.disconnect();
  });
});

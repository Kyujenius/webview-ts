import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  vi.stubGlobal('WebSocket', MockWebSocket);
});

describe('WebSocketTransport', () => {
  it('sends serialized messages', () => {
    const t = new WebSocketTransport({ port: 4000 });
    t.send({ type: 'clear' });

    const ws = (t as any).ws as MockWebSocket;
    expect(ws.sent).toContain(JSON.stringify({ type: 'clear' }));
  });

  it('receives and deserializes messages', () => {
    const t = new WebSocketTransport({ port: 4000 });
    const handler = vi.fn();
    t.onMessage(handler);

    const ws = (t as any).ws as MockWebSocket;
    ws.onmessage?.({ data: JSON.stringify({ type: 'clear' }) });

    expect(handler).toHaveBeenCalledWith({ type: 'clear' });
  });

  it('fires onDisconnect when socket closes', () => {
    const t = new WebSocketTransport({ port: 4000 });
    const handler = vi.fn();
    t.onDisconnect(handler);

    const ws = (t as any).ws as MockWebSocket;
    ws.close();

    expect(handler).toHaveBeenCalled();
  });

  it('connected reflects ws readyState', () => {
    const t = new WebSocketTransport({ port: 4000 });
    expect(t.connected).toBe(true);

    const ws = (t as any).ws as MockWebSocket;
    ws.readyState = MockWebSocket.CLOSED;
    expect(t.connected).toBe(false);
  });

  it('ignores malformed messages', () => {
    const t = new WebSocketTransport({ port: 4000 });
    const handler = vi.fn();
    t.onMessage(handler);

    const ws = (t as any).ws as MockWebSocket;
    ws.onmessage?.({ data: 'not-json{{{' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not send when socket is closed', () => {
    const t = new WebSocketTransport({ port: 4000 });
    const ws = (t as any).ws as MockWebSocket;
    ws.readyState = MockWebSocket.CLOSED;

    t.send({ type: 'clear' });
    expect(ws.sent).toHaveLength(0);
  });
});

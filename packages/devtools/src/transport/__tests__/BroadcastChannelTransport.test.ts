import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BroadcastChannelTransport } from '../BroadcastChannelTransport';

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];
  name: string;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }
  postMessage(data: unknown) {
    for (const ch of MockBroadcastChannel.instances) {
      if (ch !== this && ch.name === this.name && ch.onmessage) {
        ch.onmessage({ data });
      }
    }
  }
  close() {
    const idx = MockBroadcastChannel.instances.indexOf(this);
    if (idx >= 0) MockBroadcastChannel.instances.splice(idx, 1);
  }
}

beforeEach(() => {
  MockBroadcastChannel.instances = [];
  vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);
});

describe('BroadcastChannelTransport', () => {
  it('sends and receives messages between two transports', () => {
    const sender = new BroadcastChannelTransport();
    const receiver = new BroadcastChannelTransport();
    const handler = vi.fn();
    receiver.onMessage(handler);

    sender.send({ type: 'clear' });

    expect(handler).toHaveBeenCalledWith({ type: 'clear' });
  });

  it('connected is true initially', () => {
    const t = new BroadcastChannelTransport();
    expect(t.connected).toBe(true);
  });

  it('should return false after disconnect', () => {
    const transport = new BroadcastChannelTransport('test');
    transport.disconnect();
    expect(transport.connected).toBe(false);
  });

  it('stops receiving after disconnect', () => {
    const sender = new BroadcastChannelTransport();
    const receiver = new BroadcastChannelTransport();
    const handler = vi.fn();
    receiver.onMessage(handler);
    receiver.disconnect();

    sender.send({ type: 'clear' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('fires onDisconnect handlers', () => {
    const t = new BroadcastChannelTransport();
    const handler = vi.fn();
    t.onDisconnect(handler);
    t.disconnect();
    expect(handler).toHaveBeenCalled();
  });
});

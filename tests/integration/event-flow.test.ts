import { afterEach, describe, expect, it } from 'vitest';

import { createLoopbackPair } from './helpers/create-loopback-pair';

describe('Event flow: Host → Client', () => {
  let pair: ReturnType<typeof createLoopbackPair>;

  afterEach(() => pair?.destroy());

  it('client receives event via bridge.on()', async () => {
    pair = createLoopbackPair();
    const received: unknown[] = [];

    pair.bridge.on('location.updated', (payload) => {
      received.push(payload);
    });

    pair.sendEvent('location.updated', { latitude: 37.5, longitude: 127.0 });

    // Events via loopback are synchronous through the message callback
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ latitude: 37.5, longitude: 127.0 });
  });

  it('multiple listeners on same event all fire', () => {
    pair = createLoopbackPair();
    const log1: unknown[] = [];
    const log2: unknown[] = [];

    pair.bridge.on('push.received', (p) => log1.push(p));
    pair.bridge.on('push.received', (p) => log2.push(p));

    pair.sendEvent('push.received', { title: 'Hello' });

    expect(log1).toEqual([{ title: 'Hello' }]);
    expect(log2).toEqual([{ title: 'Hello' }]);
  });

  it('unsubscribe stops delivery', () => {
    pair = createLoopbackPair();
    const received: unknown[] = [];

    const unsub = pair.bridge.on('test.event', (p) => received.push(p));

    pair.sendEvent('test.event', { n: 1 });
    unsub();
    pair.sendEvent('test.event', { n: 2 });

    expect(received).toEqual([{ n: 1 }]);
  });

  it('bridge.off() removes all listeners for an event', () => {
    pair = createLoopbackPair();
    const received: unknown[] = [];

    pair.bridge.on('bulk', (p) => received.push(p));
    pair.bridge.on('bulk', (p) => received.push(p));

    pair.sendEvent('bulk', 'first');
    pair.bridge.off('bulk');
    pair.sendEvent('bulk', 'second');

    // 2 listeners * 1 event = 2 entries, then none after off()
    expect(received).toEqual(['first', 'first']);
  });

  it('events and call responses do not interfere', async () => {
    pair = createLoopbackPair();
    const events: unknown[] = [];

    pair.registerHostHandler('slow', async () => {
      // Host sends event DURING request processing
      pair.sendEvent('progress', { percent: 50 });
      return { done: true };
    });

    pair.bridge.on('progress', (p) => events.push(p));

    const result = await pair.bridge.call('slow', {});

    expect(result).toEqual({ done: true });
    expect(events).toEqual([{ percent: 50 }]);
  });

  it('onAnyEvent catches all events', () => {
    pair = createLoopbackPair();
    const all: Array<{ event: string; payload: unknown }> = [];

    pair.bridge.onAnyEvent((event, payload) => {
      all.push({ event, payload });
    });

    pair.sendEvent('a', { x: 1 });
    pair.sendEvent('b', { y: 2 });

    expect(all).toEqual([
      { event: 'a', payload: { x: 1 } },
      { event: 'b', payload: { y: 2 } },
    ]);
  });
});

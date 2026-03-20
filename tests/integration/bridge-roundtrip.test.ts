import { describe, it, expect, afterEach } from 'vitest';
import { createLoopbackPair } from './helpers/create-loopback-pair';

describe('Bridge round-trip: BridgeClient ↔ BridgeHost', () => {
  let pair: ReturnType<typeof createLoopbackPair>;

  afterEach(() => pair?.destroy());

  it('simple call: payload reaches host, typed response returns', async () => {
    pair = createLoopbackPair();
    pair.registerHostHandler('device.getInfo', async () => ({
      model: 'iPhone 15',
      os: 'iOS',
      version: '17.0',
    }));

    const result = await pair.bridge.call('device.getInfo', {});
    expect(result).toEqual({ model: 'iPhone 15', os: 'iOS', version: '17.0' });
  });

  it('payload is passed through correctly', async () => {
    pair = createLoopbackPair();
    pair.registerHostHandler('echo', async (payload) => ({
      echoed: payload,
    }));

    const result = await pair.bridge.call('echo', { message: 'hello', nested: { a: 1 } });
    expect(result).toEqual({ echoed: { message: 'hello', nested: { a: 1 } } });
  });

  it('multiple concurrent calls resolve independently', async () => {
    pair = createLoopbackPair();
    let counter = 0;
    pair.registerHostHandler('counter.next', async () => {
      counter++;
      return { value: counter };
    });

    const [a, b, c] = await Promise.all([
      pair.bridge.call('counter.next', {}),
      pair.bridge.call('counter.next', {}),
      pair.bridge.call('counter.next', {}),
    ]);

    const values = [
      (a as { value: number }).value,
      (b as { value: number }).value,
      (c as { value: number }).value,
    ].sort();
    expect(values).toEqual([1, 2, 3]);
  });

  it('void payload works (action with no input)', async () => {
    pair = createLoopbackPair();
    pair.registerHostHandler('ping', async () => ({ pong: true }));

    const result = await pair.bridge.call('ping', undefined);
    expect(result).toEqual({ pong: true });
  });

  it('large payload survives serialization', async () => {
    pair = createLoopbackPair();
    pair.registerHostHandler('bulk', async (payload) => ({
      count: payload.items.length,
    }));

    const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `item-${i}` }));
    const result = await pair.bridge.call('bulk', { items });
    expect(result).toEqual({ count: 1000 });
  });
});

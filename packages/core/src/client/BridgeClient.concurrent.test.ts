import { afterEach, describe, expect, it } from 'vitest';

import { BridgeClient } from './BridgeClient';

describe('BridgeClient - Concurrent Requests', () => {
  let bridge: BridgeClient;

  afterEach(() => {
    bridge?.destroy();
  });

  it('should handle 10 concurrent calls independently', async () => {
    let callCount = 0;
    bridge = new BridgeClient({
      fallback: {
        'counter.get': async () => {
          callCount++;
          return { count: callCount };
        },
      },
    });

    const results = await Promise.all(Array.from({ length: 10 }, () => bridge.call('counter.get')));

    expect(results).toHaveLength(10);
    results.forEach((r) => expect(r).toHaveProperty('count'));
  });

  it('should handle same action+payload from multiple callers independently', async () => {
    let callCount = 0;
    bridge = new BridgeClient({
      fallback: {
        'data.fetch': async () => {
          callCount++;
          return { value: callCount };
        },
      },
    });

    const [r1, r2] = await Promise.all([
      bridge.call('data.fetch', { id: 1 }),
      bridge.call('data.fetch', { id: 1 }),
    ]);

    expect(callCount).toBe(2);
    expect(r1).toHaveProperty('value');
    expect(r2).toHaveProperty('value');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createLoopbackPair } from './helpers/create-loopback-pair';

describe('Error propagation', () => {
  let pair: ReturnType<typeof createLoopbackPair>;

  afterEach(() => pair?.destroy());

  it('host handler error propagates as rejection to client', async () => {
    pair = createLoopbackPair();
    pair.registerHostHandler('fail', async () => {
      throw new Error('host-side failure');
    });

    await expect(pair.bridge.call('fail', {})).rejects.toThrow('host-side failure');
  });

  it('error preserves code from BridgeCallError', async () => {
    pair = createLoopbackPair();
    pair.registerHostHandler('fail-with-code', async () => {
      const err = new Error('permission denied');
      (err as any).code = 'PERMISSION_DENIED';
      throw err;
    });

    try {
      await pair.bridge.call('fail-with-code', {});
      expect.unreachable();
    } catch (err: any) {
      expect(err.message).toContain('permission denied');
    }
  });

  it('calling unregistered action returns clear error', async () => {
    pair = createLoopbackPair();

    await expect(pair.bridge.call('nonexistent', {})).rejects.toThrow();
  });
});

describe('Retry logic', () => {
  let pair: ReturnType<typeof createLoopbackPair>;

  afterEach(() => pair?.destroy());

  it('retries on failure and eventually succeeds', async () => {
    pair = createLoopbackPair();

    let attempts = 0;
    pair.registerHostHandler('flaky', async () => {
      attempts++;
      if (attempts < 3) throw new Error(`attempt ${attempts} failed`);
      return { ok: true };
    });

    const result = await pair.bridge.call(
      'flaky',
      {},
      {
        retry: { maxAttempts: 3, delay: 10 },
      }
    );

    expect(result).toEqual({ ok: true });
    expect(attempts).toBe(3);
  });

  it('gives up after maxAttempts', async () => {
    pair = createLoopbackPair();

    pair.registerHostHandler('always-fail', async () => {
      throw new Error('nope');
    });

    await expect(
      pair.bridge.call(
        'always-fail',
        {},
        {
          retry: { maxAttempts: 2, delay: 10 },
        }
      )
    ).rejects.toThrow('nope');
  });
});

describe('Timeout', () => {
  let pair: ReturnType<typeof createLoopbackPair>;

  afterEach(() => {
    vi.useRealTimers();
    pair?.destroy();
  });

  it('host-side timeout rejects slow handlers', async () => {
    pair = createLoopbackPair({ hostConfig: { timeout: 50 } });

    pair.registerHostHandler('slow', async () => {
      await new Promise((r) => setTimeout(r, 200));
      return { done: true };
    });

    const response = await pair.host.handleMessage({
      id: 'timeout-1',
      sourceId: 'client-1',
      targetId: 'host',
      action: 'slow',
      payload: {},
      timestamp: Date.now(),
    });

    expect(response.success).toBe(false);
  });
});

import { BridgeCallError } from '@webview-ts/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BridgeClient } from './BridgeClient';

describe('BridgeClient retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call global onError on failure', async () => {
    const onError = vi.fn();
    const bridge = new BridgeClient({ onError, timeout: 50 });
    const callPromise = bridge.call('test.action', { key: 'value' }).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(100);
    const result = await callPromise;
    expect(result).toBeInstanceOf(Error);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: expect.any(String), message: expect.any(String) }),
      expect.objectContaining({
        action: 'test.action',
        payload: { key: 'value' },
        attempt: 1,
        timestamp: expect.any(Number),
      })
    );
  });

  it('should not retry when retry is not configured', async () => {
    const onError = vi.fn();
    const bridge = new BridgeClient({ onError, timeout: 50 });
    const callPromise = bridge.call('test.action', {}).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(100);
    const result = await callPromise;
    expect(result).toBeInstanceOf(Error);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure up to maxAttempts', async () => {
    const onError = vi.fn();
    const bridge = new BridgeClient({
      retry: { maxAttempts: 2, delay: 100 },
      onError,
      fallback: {
        'test.action': () => {
          throw new BridgeCallError('flaky', 'NETWORK_ERROR');
        },
      },
    });
    const callPromise = bridge.call('test.action', {}).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(500);
    const result = await callPromise;
    expect(result).toBeInstanceOf(Error);
    expect(onError).toHaveBeenCalledTimes(3); // 1 original + 2 retries
  });

  it('should respect per-call retry override', async () => {
    const onError = vi.fn();
    const bridge = new BridgeClient({
      retry: { maxAttempts: 3, delay: 100 },
      onError,
      fallback: {
        'test.action': () => {
          throw new BridgeCallError('flaky', 'NETWORK_ERROR');
        },
      },
    });
    const callPromise = bridge
      .call('test.action', {}, { retry: { maxAttempts: 1, delay: 100 } })
      .catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(500);
    const result = await callPromise;
    expect(result).toBeInstanceOf(Error);
    expect(onError).toHaveBeenCalledTimes(2); // 1 original + 1 retry
  });

  it('should not retry VALIDATION_ERROR by default', async () => {
    const onError = vi.fn();
    const bridge = new BridgeClient({
      retry: { maxAttempts: 3, delay: 100 },
      onError,
      fallback: {
        'test.action': () => {
          throw new BridgeCallError('invalid payload', 'VALIDATION_ERROR');
        },
      },
    });
    const callPromise = bridge.call('test.action', {}).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await callPromise;
    expect(result).toBeInstanceOf(BridgeCallError);
    expect((result as BridgeCallError).code).toBe('VALIDATION_ERROR');
    expect(onError).toHaveBeenCalledTimes(1); // no retries
  });

  it('should let retryIf take over the retry decision', async () => {
    const onError = vi.fn();
    const bridge = new BridgeClient({
      retry: { maxAttempts: 2, delay: 100, retryIf: (error) => error.code === 'VALIDATION_ERROR' },
      onError,
      fallback: {
        'test.action': () => {
          throw new BridgeCallError('invalid payload', 'VALIDATION_ERROR');
        },
      },
    });
    const callPromise = bridge.call('test.action', {}).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(1000);
    await callPromise;
    expect(onError).toHaveBeenCalledTimes(3); // retryIf opted back in: 1 original + 2 retries
  });

  it('should stop retrying when retryIf returns false', async () => {
    const onError = vi.fn();
    const bridge = new BridgeClient({
      retry: { maxAttempts: 3, delay: 100, retryIf: () => false },
      onError,
      timeout: 50,
    });
    const callPromise = bridge.call('test.action', {}).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await callPromise;
    expect(result).toBeInstanceOf(Error);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe('BridgeClient retry vs destroy', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not re-send after destroy() during the backoff delay', async () => {
    let attempts = 0;
    const bridge = new BridgeClient({
      retry: { maxAttempts: 3, delay: 200 },
      fallback: {
        'pay.charge': () => {
          attempts += 1;
          throw new BridgeCallError('flaky', 'NETWORK_ERROR');
        },
      },
    });
    const callPromise = bridge.call('pay.charge', {}).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(50); // first attempt failed, now in backoff
    bridge.destroy();
    await vi.advanceTimersByTimeAsync(2000);
    const result = await callPromise;
    expect(result).toBeInstanceOf(Error);
    expect(attempts).toBe(1); // never re-sent after destroy
  });
});

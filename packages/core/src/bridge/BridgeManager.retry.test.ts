import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BridgeManager } from './BridgeManager';

describe('BridgeManager retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call global onError on failure', async () => {
    const onError = vi.fn();
    const bridge = new BridgeManager({ onError, timeout: 50 });
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
    const bridge = new BridgeManager({ onError, timeout: 50 });
    const callPromise = bridge.call('test.action', {}).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(100);
    const result = await callPromise;
    expect(result).toBeInstanceOf(Error);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure up to maxAttempts', async () => {
    const onError = vi.fn();
    const bridge = new BridgeManager({
      retry: { maxAttempts: 2, delay: 100 },
      onError,
      timeout: 50,
    });
    const callPromise = bridge.call('test.action', {}).catch((e: unknown) => e);
    // Advance enough time for original + 2 retries (each timeout + delay)
    await vi.advanceTimersByTimeAsync(60);
    await vi.advanceTimersByTimeAsync(200);
    await vi.advanceTimersByTimeAsync(200);
    const result = await callPromise;
    expect(result).toBeInstanceOf(Error);
    expect(onError).toHaveBeenCalledTimes(3); // 1 original + 2 retries
  });

  it('should respect per-call retry override', async () => {
    const onError = vi.fn();
    const bridge = new BridgeManager({
      retry: { maxAttempts: 3, delay: 100 },
      onError,
      timeout: 50,
    });
    const callPromise = bridge
      .call('test.action', {}, { retry: { maxAttempts: 1, delay: 100 } })
      .catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(60);
    await vi.advanceTimersByTimeAsync(200);
    const result = await callPromise;
    expect(result).toBeInstanceOf(Error);
    expect(onError).toHaveBeenCalledTimes(2); // 1 original + 1 retry
  });
});

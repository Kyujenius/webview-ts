import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CallbackRegistry } from './CallbackRegistry';
import { BridgeCallError } from '@webview-ts/shared';

describe('CallbackRegistry', () => {
  let registry: CallbackRegistry;

  beforeEach(() => {
    vi.useFakeTimers();
    registry = new CallbackRegistry();
  });

  it('should reject with BridgeCallError with code TIMEOUT on timeout', async () => {
    const resolve = vi.fn();
    const reject = vi.fn();

    registry.register('msg-1', resolve, reject, 1000);

    vi.advanceTimersByTime(1000);

    expect(reject).toHaveBeenCalledTimes(1);
    const error = reject.mock.calls[0][0];
    expect(error).toBeInstanceOf(BridgeCallError);
    expect(error.code).toBe('TIMEOUT');
    expect(error.message).toBe('Bridge call timeout after 1000ms');
  });

  it('should resolve callback on handleResponse', () => {
    const resolve = vi.fn();
    const reject = vi.fn();

    registry.register('msg-2', resolve, reject, 5000);

    const response = {
      id: 'msg-2',
      success: true as const,
      data: { result: 'ok' },
      timestamp: Date.now(),
    };

    registry.handleResponse(response);

    expect(resolve).toHaveBeenCalledWith(response);
    expect(reject).not.toHaveBeenCalled();
  });

  it('should not timeout after response is handled', () => {
    const resolve = vi.fn();
    const reject = vi.fn();

    registry.register('msg-3', resolve, reject, 1000);

    registry.handleResponse({
      id: 'msg-3',
      success: true as const,
      data: null,
      timestamp: Date.now(),
    });

    vi.advanceTimersByTime(1000);

    expect(reject).not.toHaveBeenCalled();
  });
});

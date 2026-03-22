import { describe, it, expect } from 'vitest';
import { BridgeCallError, getErrorCategory, isRetryable, isAuthError } from './errors';

describe('BridgeCallError', () => {
  it('should carry code and details', () => {
    const err = new BridgeCallError('fail', 'TIMEOUT', { elapsed: 5000 });
    expect(err.message).toBe('fail');
    expect(err.code).toBe('TIMEOUT');
    expect(err.details).toEqual({ elapsed: 5000 });
    expect(err instanceof Error).toBe(true);
  });
});

describe('ErrorCategory', () => {
  it('TIMEOUT is transient', () => {
    const err = new BridgeCallError('timeout', 'TIMEOUT');
    expect(getErrorCategory(err)).toBe('transient');
  });

  it('NETWORK_ERROR is transient', () => {
    const err = new BridgeCallError('network', 'NETWORK_ERROR');
    expect(getErrorCategory(err)).toBe('transient');
  });

  it('HANDLER_NOT_FOUND is server', () => {
    const err = new BridgeCallError('not found', 'HANDLER_NOT_FOUND');
    expect(getErrorCategory(err)).toBe('server');
  });

  it('PERMISSION_DENIED is auth', () => {
    const err = new BridgeCallError('denied', 'PERMISSION_DENIED');
    expect(getErrorCategory(err)).toBe('auth');
  });

  it('NATIVE_UNAVAILABLE is client', () => {
    const err = new BridgeCallError('unavailable', 'NATIVE_UNAVAILABLE');
    expect(getErrorCategory(err)).toBe('client');
  });
});

describe('isRetryable', () => {
  it('returns true for transient errors', () => {
    expect(isRetryable(new BridgeCallError('t', 'TIMEOUT'))).toBe(true);
    expect(isRetryable(new BridgeCallError('n', 'NETWORK_ERROR'))).toBe(true);
  });

  it('returns false for non-transient errors', () => {
    expect(isRetryable(new BridgeCallError('h', 'HANDLER_NOT_FOUND'))).toBe(false);
    expect(isRetryable(new BridgeCallError('p', 'PERMISSION_DENIED'))).toBe(false);
  });
});

describe('isAuthError', () => {
  it('returns true for auth errors', () => {
    expect(isAuthError(new BridgeCallError('p', 'PERMISSION_DENIED'))).toBe(true);
  });

  it('returns false for non-auth errors', () => {
    expect(isAuthError(new BridgeCallError('t', 'TIMEOUT'))).toBe(false);
  });
});

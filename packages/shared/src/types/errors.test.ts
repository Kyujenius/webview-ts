import { describe, expect, it } from 'vitest';

import {
  BridgeCallError,
  getErrorCategory,
  isAuthError,
  isRetryable,
  toBridgeErrorCode,
} from './errors';

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

describe('toBridgeErrorCode', () => {
  it('returns the code for all 10 valid BridgeErrorCode values', () => {
    expect(toBridgeErrorCode('TIMEOUT')).toBe('TIMEOUT');
    expect(toBridgeErrorCode('HANDLER_NOT_FOUND')).toBe('HANDLER_NOT_FOUND');
    expect(toBridgeErrorCode('PERMISSION_DENIED')).toBe('PERMISSION_DENIED');
    expect(toBridgeErrorCode('NATIVE_UNAVAILABLE')).toBe('NATIVE_UNAVAILABLE');
    expect(toBridgeErrorCode('HANDLER_ERROR')).toBe('HANDLER_ERROR');
    expect(toBridgeErrorCode('NETWORK_ERROR')).toBe('NETWORK_ERROR');
    expect(toBridgeErrorCode('MIDDLEWARE_ERROR')).toBe('MIDDLEWARE_ERROR');
    expect(toBridgeErrorCode('FALLBACK_ERROR')).toBe('FALLBACK_ERROR');
    expect(toBridgeErrorCode('NO_FALLBACK')).toBe('NO_FALLBACK');
    expect(toBridgeErrorCode('UNKNOWN_ERROR')).toBe('UNKNOWN_ERROR');
  });

  it('returns UNKNOWN_ERROR for invalid string', () => {
    expect(toBridgeErrorCode('NOT_A_CODE')).toBe('UNKNOWN_ERROR');
  });

  it('returns UNKNOWN_ERROR for non-string values', () => {
    expect(toBridgeErrorCode(42)).toBe('UNKNOWN_ERROR');
    expect(toBridgeErrorCode(null)).toBe('UNKNOWN_ERROR');
    expect(toBridgeErrorCode(undefined)).toBe('UNKNOWN_ERROR');
    expect(toBridgeErrorCode({})).toBe('UNKNOWN_ERROR');
  });
});

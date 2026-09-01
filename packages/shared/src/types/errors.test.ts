import { describe, expect, it } from 'vite-plus/test';

import { BridgeCallError, ERROR_CODE, toBridgeErrorCode } from './errors';

describe('BridgeCallError', () => {
  it('should carry code and details', () => {
    const err = new BridgeCallError('fail', 'TIMEOUT', { elapsed: 5000 });
    expect(err.message).toBe('fail');
    expect(err.code).toBe('TIMEOUT');
    expect(err.details).toEqual({ elapsed: 5000 });
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

describe('ERROR_CODE constant', () => {
  it('every key maps to itself and validates as a known code', () => {
    for (const [key, value] of Object.entries(ERROR_CODE)) {
      expect(value).toBe(key);
      expect(toBridgeErrorCode(value)).toBe(value);
    }
  });

  it('unknown strings normalize to UNKNOWN_ERROR', () => {
    expect(toBridgeErrorCode('nope')).toBe(ERROR_CODE.UNKNOWN_ERROR);
  });
});

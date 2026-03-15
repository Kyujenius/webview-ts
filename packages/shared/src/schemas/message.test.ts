import { describe, it, expect } from 'vitest';
import { isBridgeMessage, isBridgeResponse, isBridgeEvent } from './message';

describe('isBridgeMessage', () => {
  it('should return true for valid message', () => {
    expect(isBridgeMessage({ id: '1', action: 'test', timestamp: 123 })).toBe(true);
  });

  it('should return true for message with payload', () => {
    expect(isBridgeMessage({ id: '1', action: 'test', payload: { foo: 1 }, timestamp: 123 })).toBe(true);
  });

  it('should return false for null', () => {
    expect(isBridgeMessage(null)).toBe(false);
  });

  it('should return false for missing id', () => {
    expect(isBridgeMessage({ action: 'test', timestamp: 123 })).toBe(false);
  });

  it('should return false for missing action', () => {
    expect(isBridgeMessage({ id: '1', timestamp: 123 })).toBe(false);
  });

  it('should return false for missing timestamp', () => {
    expect(isBridgeMessage({ id: '1', action: 'test' })).toBe(false);
  });
});

describe('isBridgeResponse', () => {
  it('should return true for success response', () => {
    expect(isBridgeResponse({ id: '1', success: true, timestamp: 123 })).toBe(true);
  });

  it('should return true for error response', () => {
    expect(isBridgeResponse({
      id: '1', success: false, timestamp: 123,
      error: { code: 'ERR', message: 'fail' },
    })).toBe(true);
  });

  it('should return false for missing success', () => {
    expect(isBridgeResponse({ id: '1', timestamp: 123 })).toBe(false);
  });

  it('should return false for non-boolean success', () => {
    expect(isBridgeResponse({ id: '1', success: 'yes', timestamp: 123 })).toBe(false);
  });
});

describe('isBridgeEvent', () => {
  it('should return true for valid event', () => {
    expect(isBridgeEvent({ event: 'click', payload: {}, timestamp: 123 })).toBe(true);
  });

  it('should return false for missing event', () => {
    expect(isBridgeEvent({ payload: {}, timestamp: 123 })).toBe(false);
  });

  it('should return false for missing timestamp', () => {
    expect(isBridgeEvent({ event: 'click', payload: {} })).toBe(false);
  });
});

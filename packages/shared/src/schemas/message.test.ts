import { describe, it, expect } from 'vitest';
import { isBridgeEvent, isBridgeMessage, isBridgeResponse } from './message';

describe('isBridgeMessage', () => {
  it('should return true for valid message', () => {
    expect(isBridgeMessage({ id: '1', action: 'test', timestamp: 123 })).toBe(true);
  });

  it('should return true for message with payload', () => {
    expect(isBridgeMessage({ id: '1', action: 'test', payload: { foo: 1 }, timestamp: 123 })).toBe(
      true
    );
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
  it('should return true for success response with data', () => {
    expect(isBridgeResponse({ id: '1', success: true, data: 42, timestamp: 123 })).toBe(true);
  });

  it('should return true for error response', () => {
    expect(
      isBridgeResponse({
        id: '1',
        success: false,
        timestamp: 123,
        error: { code: 'ERR', message: 'fail' },
      })
    ).toBe(true);
  });

  it('should return false for missing success', () => {
    expect(isBridgeResponse({ id: '1', timestamp: 123 })).toBe(false);
  });

  it('should return false for non-boolean success', () => {
    expect(isBridgeResponse({ id: '1', success: 'yes', timestamp: 123 })).toBe(false);
  });

  it('validates success response (data required)', () => {
    expect(isBridgeResponse({ id: '1', success: true, data: 42, timestamp: 1 })).toBe(true);
  });

  it('validates error response (error required)', () => {
    expect(
      isBridgeResponse({
        id: '1',
        success: false,
        error: { code: 'TIMEOUT', message: 'x' },
        timestamp: 1,
      })
    ).toBe(true);
  });

  it('rejects success response without data', () => {
    expect(isBridgeResponse({ id: '1', success: true, timestamp: 1 })).toBe(false);
  });

  it('rejects error response without error', () => {
    expect(isBridgeResponse({ id: '1', success: false, timestamp: 1 })).toBe(false);
  });
});

describe('isBridgeEvent', () => {
  it('should return true for valid event', () => {
    expect(isBridgeEvent({ event: 'location.updated', payload: {}, timestamp: 1 })).toBe(true);
  });

  it('should return true for event with any payload', () => {
    expect(isBridgeEvent({ event: 'data.changed', payload: [1, 2, 3], timestamp: 100 })).toBe(true);
  });

  it('should return false for missing event field', () => {
    expect(isBridgeEvent({ payload: {}, timestamp: 1 })).toBe(false);
  });

  it('should return false for missing payload field', () => {
    expect(isBridgeEvent({ event: 'test', timestamp: 1 })).toBe(false);
  });

  it('should return false for missing timestamp', () => {
    expect(isBridgeEvent({ event: 'test', payload: {} })).toBe(false);
  });

  it('should return false for non-object values', () => {
    expect(isBridgeEvent(null)).toBe(false);
    expect(isBridgeEvent('string')).toBe(false);
    expect(isBridgeEvent(42)).toBe(false);
  });
});

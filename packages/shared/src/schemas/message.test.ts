import { describe, it, expect } from 'vitest';
import { isBridgeEvent, isBridgeMessage, isBridgeResponse } from './message';

describe('isBridgeMessage', () => {
  it('should return true for valid message', () => {
    expect(
      isBridgeMessage({
        id: '1',
        sourceId: 'web-1',
        targetId: 'native',
        action: 'test',
        timestamp: 123,
      })
    ).toBe(true);
  });

  it('should return true for message with payload', () => {
    expect(
      isBridgeMessage({
        id: '1',
        sourceId: 'web-1',
        targetId: 'native',
        action: 'test',
        payload: { foo: 1 },
        timestamp: 123,
      })
    ).toBe(true);
  });

  it('should return false for null', () => {
    expect(isBridgeMessage(null)).toBe(false);
  });

  it('should return false for missing id', () => {
    expect(
      isBridgeMessage({ sourceId: 'web-1', targetId: 'native', action: 'test', timestamp: 123 })
    ).toBe(false);
  });

  it('should return false for missing sourceId', () => {
    expect(isBridgeMessage({ id: '1', targetId: 'native', action: 'test', timestamp: 123 })).toBe(
      false
    );
  });

  it('should return false for missing targetId', () => {
    expect(isBridgeMessage({ id: '1', sourceId: 'web-1', action: 'test', timestamp: 123 })).toBe(
      false
    );
  });

  it('should return false for missing action', () => {
    expect(
      isBridgeMessage({ id: '1', sourceId: 'web-1', targetId: 'native', timestamp: 123 })
    ).toBe(false);
  });

  it('should return false for missing timestamp', () => {
    expect(
      isBridgeMessage({ id: '1', sourceId: 'web-1', targetId: 'native', action: 'test' })
    ).toBe(false);
  });
});

describe('isBridgeResponse', () => {
  it('should return true for success response with data', () => {
    expect(
      isBridgeResponse({
        id: '1',
        sourceId: 'native',
        targetId: 'web-1',
        success: true,
        data: 42,
        timestamp: 123,
      })
    ).toBe(true);
  });

  it('should return true for error response', () => {
    expect(
      isBridgeResponse({
        id: '1',
        sourceId: 'native',
        targetId: 'web-1',
        success: false,
        timestamp: 123,
        error: { code: 'ERR', message: 'fail' },
      })
    ).toBe(true);
  });

  it('should return false for missing success', () => {
    expect(
      isBridgeResponse({ id: '1', sourceId: 'native', targetId: 'web-1', timestamp: 123 })
    ).toBe(false);
  });

  it('should return false for non-boolean success', () => {
    expect(
      isBridgeResponse({
        id: '1',
        sourceId: 'native',
        targetId: 'web-1',
        success: 'yes',
        timestamp: 123,
      })
    ).toBe(false);
  });

  it('validates success response (data required)', () => {
    expect(
      isBridgeResponse({
        id: '1',
        sourceId: 'native',
        targetId: 'web-1',
        success: true,
        data: 42,
        timestamp: 1,
      })
    ).toBe(true);
  });

  it('validates error response (error required)', () => {
    expect(
      isBridgeResponse({
        id: '1',
        sourceId: 'native',
        targetId: 'web-1',
        success: false,
        error: { code: 'TIMEOUT', message: 'x' },
        timestamp: 1,
      })
    ).toBe(true);
  });

  it('rejects success response without data', () => {
    expect(
      isBridgeResponse({
        id: '1',
        sourceId: 'native',
        targetId: 'web-1',
        success: true,
        timestamp: 1,
      })
    ).toBe(false);
  });

  it('rejects error response without error', () => {
    expect(
      isBridgeResponse({
        id: '1',
        sourceId: 'native',
        targetId: 'web-1',
        success: false,
        timestamp: 1,
      })
    ).toBe(false);
  });

  it('should return false for missing sourceId', () => {
    expect(
      isBridgeResponse({ id: '1', targetId: 'web-1', success: true, data: 42, timestamp: 123 })
    ).toBe(false);
  });

  it('should return false for missing targetId', () => {
    expect(
      isBridgeResponse({ id: '1', sourceId: 'native', success: true, data: 42, timestamp: 123 })
    ).toBe(false);
  });
});

describe('isBridgeEvent', () => {
  it('should return true for valid event', () => {
    expect(
      isBridgeEvent({ sourceId: 'native', event: 'location.updated', payload: {}, timestamp: 1 })
    ).toBe(true);
  });

  it('should return true for event with any payload', () => {
    expect(
      isBridgeEvent({
        sourceId: 'native',
        event: 'data.changed',
        payload: [1, 2, 3],
        timestamp: 100,
      })
    ).toBe(true);
  });

  it('should return false for missing sourceId', () => {
    expect(isBridgeEvent({ event: 'location.updated', payload: {}, timestamp: 1 })).toBe(false);
  });

  it('should return false for missing event field', () => {
    expect(isBridgeEvent({ sourceId: 'native', payload: {}, timestamp: 1 })).toBe(false);
  });

  it('should return false for missing payload field', () => {
    expect(isBridgeEvent({ sourceId: 'native', event: 'test', timestamp: 1 })).toBe(false);
  });

  it('should return false for missing timestamp', () => {
    expect(isBridgeEvent({ sourceId: 'native', event: 'test', payload: {} })).toBe(false);
  });

  it('should return false for non-object values', () => {
    expect(isBridgeEvent(null)).toBe(false);
    expect(isBridgeEvent('string')).toBe(false);
    expect(isBridgeEvent(42)).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import type { BridgeMessage, BridgeResponse, BridgeError, BridgeEvent } from './message';
import { MessageType } from './message';

describe('Message Types', () => {
  describe('BridgeMessage', () => {
    it('should have correct structure', () => {
      const message: BridgeMessage<{ foo: string }> = {
        id: 'test-id',
        action: 'test-action',
        payload: { foo: 'bar' },
        timestamp: Date.now(),
      };

      expect(message.id).toBe('test-id');
      expect(message.action).toBe('test-action');
      expect(message.payload).toEqual({ foo: 'bar' });
      expect(typeof message.timestamp).toBe('number');
    });
  });

  describe('BridgeResponse', () => {
    it('should support successful response', () => {
      const response: BridgeResponse<{ result: number }> = {
        id: 'test-id',
        success: true,
        data: { result: 42 },
        timestamp: Date.now(),
      };

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ result: 42 });
      expect(response.error).toBeUndefined();
    });

    it('should support error response', () => {
      const error: BridgeError = {
        code: 'UNKNOWN_ERROR',
        message: 'Test error message',
        details: { info: 'extra' },
      };

      const response: BridgeResponse = {
        id: 'test-id',
        success: false,
        error,
        timestamp: Date.now(),
      };

      expect(response.success).toBe(false);
      expect(response.error).toEqual(error);
      expect(response.data).toBeUndefined();
    });
  });

  describe('BridgeEvent', () => {
    it('should have correct structure', () => {
      const event: BridgeEvent<{ value: string }> = {
        event: 'test-event',
        payload: { value: 'test' },
        timestamp: Date.now(),
      };

      expect(event.event).toBe('test-event');
      expect(event.payload).toEqual({ value: 'test' });
      expect(typeof event.timestamp).toBe('number');
    });
  });

  describe('BridgeError', () => {
    it('BridgeError code should be a valid BridgeErrorCode', () => {
      const error: BridgeError = {
        code: 'TIMEOUT',
        message: 'timed out',
      };
      expect(error.code).toBe('TIMEOUT');

      const error2: BridgeError = {
        code: 'HANDLER_NOT_FOUND',
        message: 'no handler',
      };
      expect(error2.code).toBe('HANDLER_NOT_FOUND');
    });
  });

  describe('MessageType', () => {
    it('should have correct enum values', () => {
      expect(MessageType.REQUEST).toBe('request');
      expect(MessageType.RESPONSE).toBe('response');
      expect(MessageType.EVENT).toBe('event');
    });
  });
});

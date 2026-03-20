import { describe, it, expect } from 'vitest';
import type { BridgeMessage, BridgeResponse, BridgeError, BridgeEvent } from './message';
import type { BridgeErrorCode } from './errors';
import { MessageType } from './message';

describe('Message Types', () => {
  describe('BridgeMessage', () => {
    it('should have correct structure', () => {
      const message: BridgeMessage<{ foo: string }> = {
        id: 'test-id',
        sourceId: 'client-1',
        targetId: 'host',
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
        sourceId: 'host',
        targetId: 'client-1',
        success: true,
        data: { result: 42 },
        timestamp: Date.now(),
      };

      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data).toEqual({ result: 42 });
      }
    });

    it('should support error response', () => {
      const error: BridgeError = {
        code: 'UNKNOWN_ERROR',
        message: 'Test error message',
        details: { info: 'extra' },
      };

      const response: BridgeResponse = {
        id: 'test-id',
        sourceId: 'host',
        targetId: 'client-1',
        success: false,
        error,
        timestamp: Date.now(),
      };

      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error).toEqual(error);
      }
    });
  });

  describe('BridgeResponse discriminated union', () => {
    it('narrows to success variant with data: T', () => {
      const res: BridgeResponse<number> = {
        id: '1',
        sourceId: 'host',
        targetId: 'client-1',
        success: true,
        data: 42,
        timestamp: Date.now(),
      };
      if (res.success) {
        const val: number = res.data;
        expect(val).toBe(42);
      }
    });

    it('narrows to error variant with error: BridgeError', () => {
      const res: BridgeResponse = {
        id: '1',
        sourceId: 'host',
        targetId: 'client-1',
        success: false,
        error: { code: 'TIMEOUT', message: 'timed out' },
        timestamp: Date.now(),
      };
      if (!res.success) {
        const code: BridgeErrorCode = res.error.code;
        expect(code).toBe('TIMEOUT');
      }
    });
  });

  describe('BridgeEvent', () => {
    it('should have correct structure', () => {
      const event: BridgeEvent<{ value: string }> = {
        sourceId: 'host',
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

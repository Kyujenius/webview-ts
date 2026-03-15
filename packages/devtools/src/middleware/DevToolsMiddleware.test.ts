import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DevToolsMiddleware } from './DevToolsMiddleware';
import type { BridgeMessage, BridgeResponse, MiddlewareContext } from '@ts-bridge/shared';
import { MessageDirection, MessageStatus } from '../types/index';

describe('DevToolsMiddleware', () => {
  let middleware: DevToolsMiddleware;

  beforeEach(() => {
    middleware = new DevToolsMiddleware({
      enabled: true,
    });
  });

  describe('message recording', () => {
    it('should record successful request and response', async () => {
      const message: BridgeMessage = {
        id: 'msg-1',
        action: 'testAction',
        payload: { test: 'data' },
        timestamp: Date.now(),
      };

      const response: BridgeResponse = {
        id: 'msg-1',
        success: true,
        data: { result: 'success' },
        timestamp: Date.now(),
      };

      const context: MiddlewareContext = {
        request: message,
        startTime: Date.now(),
        metadata: {},
      };

      // Call onRequest
      await middleware.onRequest(context);

      // Add response to context
      context.response = response;

      // Call onResponse
      await middleware.onResponse(context);

      const messages = middleware.getStore().getMessages();
      expect(messages).toHaveLength(2);

      // Check request record
      const requestRecord = messages[0];
      expect(requestRecord.direction).toBe(MessageDirection.REQUEST);
      expect(requestRecord.status).toBe(MessageStatus.PENDING);
      expect(requestRecord.message).toEqual(message);

      // Check response record
      const responseRecord = messages[1];
      expect(responseRecord.direction).toBe(MessageDirection.RESPONSE);
      expect(responseRecord.status).toBe(MessageStatus.SUCCESS);
      expect(responseRecord.message).toEqual(response);
      expect(responseRecord.duration).toBeGreaterThanOrEqual(0);
    });

    it('should record error response', async () => {
      const message: BridgeMessage = {
        id: 'msg-1',
        action: 'testAction',
        timestamp: Date.now(),
      };

      const errorResponse: BridgeResponse = {
        id: 'msg-1',
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
        },
        timestamp: Date.now(),
      };

      const context: MiddlewareContext = {
        request: message,
        response: errorResponse,
        startTime: Date.now(),
        metadata: {},
      };

      await middleware.onRequest(context);
      await middleware.onResponse(context);

      const messages = middleware.getStore().getMessages();
      const responseRecord = messages[1];

      expect(responseRecord.status).toBe(MessageStatus.ERROR);
      expect(responseRecord.message).toEqual(errorResponse);
    });

    it('should record exception', async () => {
      const message: BridgeMessage = {
        id: 'msg-1',
        action: 'testAction',
        timestamp: Date.now(),
      };

      const error = new Error('Test exception');

      const context: MiddlewareContext = {
        request: message,
        startTime: Date.now(),
        metadata: {},
      };

      await middleware.onRequest(context);
      await middleware.onError(context, error);

      const messages = middleware.getStore().getMessages();
      const errorRecord = messages[1];

      expect(errorRecord.status).toBe(MessageStatus.ERROR);
      expect(errorRecord.stackTrace).toBeDefined();
    });
  });

  describe('filtering', () => {
    it('should filter messages based on custom filter', async () => {
      const customMiddleware = new DevToolsMiddleware({
        enabled: true,
        filter: (msg) => {
          if ('action' in msg) {
            return msg.action !== 'filteredAction';
          }
          return true;
        },
      });

      const filteredMessage: BridgeMessage = {
        id: 'msg-1',
        action: 'filteredAction',
        timestamp: Date.now(),
      };

      const allowedMessage: BridgeMessage = {
        id: 'msg-2',
        action: 'allowedAction',
        timestamp: Date.now(),
      };

      const context1: MiddlewareContext = {
        request: filteredMessage,
        startTime: Date.now(),
        metadata: {},
      };

      const context2: MiddlewareContext = {
        request: allowedMessage,
        response: {
          id: 'msg-2',
          success: true,
          timestamp: Date.now(),
        },
        startTime: Date.now(),
        metadata: {},
      };

      await customMiddleware.onRequest(context1);
      await customMiddleware.onRequest(context2);
      await customMiddleware.onResponse(context2);

      const messages = customMiddleware.getStore().getMessages();
      expect(messages).toHaveLength(2); // Only allowedAction recorded
      expect((messages[0].message as BridgeMessage).action).toBe('allowedAction');
    });
  });

  describe('configuration', () => {
    it('should not record when disabled', async () => {
      middleware.setEnabled(false);

      const message: BridgeMessage = {
        id: 'msg-1',
        action: 'testAction',
        timestamp: Date.now(),
      };

      const context: MiddlewareContext = {
        request: message,
        response: {
          id: 'msg-1',
          success: true,
          timestamp: Date.now(),
        },
        startTime: Date.now(),
        metadata: {},
      };

      await middleware.onRequest(context);
      await middleware.onResponse(context);

      const messages = middleware.getStore().getMessages();
      expect(messages).toHaveLength(0);
    });

    it('should clear messages', async () => {
      const message: BridgeMessage = {
        id: 'msg-1',
        action: 'testAction',
        timestamp: Date.now(),
      };

      const context: MiddlewareContext = {
        request: message,
        response: {
          id: 'msg-1',
          success: true,
          timestamp: Date.now(),
        },
        startTime: Date.now(),
        metadata: {},
      };

      await middleware.onRequest(context);
      await middleware.onResponse(context);
      expect(middleware.getStore().getMessages()).toHaveLength(2);

      middleware.clear();
      expect(middleware.getStore().getMessages()).toHaveLength(0);
    });
  });

  describe('message callback', () => {
    it('should call onMessage callback', async () => {
      const onMessageMock = vi.fn();
      const callbackMiddleware = new DevToolsMiddleware({
        enabled: true,
        onMessage: onMessageMock,
      });

      const message: BridgeMessage = {
        id: 'msg-1',
        action: 'testAction',
        timestamp: Date.now(),
      };

      const context: MiddlewareContext = {
        request: message,
        response: {
          id: 'msg-1',
          success: true,
          timestamp: Date.now(),
        },
        startTime: Date.now(),
        metadata: {},
      };

      await callbackMiddleware.onRequest(context);
      await callbackMiddleware.onResponse(context);

      expect(onMessageMock).toHaveBeenCalledTimes(2); // Once for request, once for response
    });
  });
});

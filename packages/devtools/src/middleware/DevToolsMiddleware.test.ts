import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DevToolsMiddleware } from './DevToolsMiddleware';
import type { BridgeMessage, BridgeResponse, MiddlewareContext } from '@webview-ts/shared';
import { MessageDirection, MessageStatus } from '../types/index';

/** Helper: run middleware.fn as onion — simulates next() resolving with a response */
async function runMiddleware(
  mw: DevToolsMiddleware,
  ctx: MiddlewareContext,
  options?: { error?: Error }
) {
  const fn = mw.fn;
  await fn(ctx, async () => {
    if (options?.error) throw options.error;
    // Simulate core completing — response should already be on ctx if expected
  });
}

function makeCtx(message: BridgeMessage, response?: BridgeResponse): MiddlewareContext {
  return {
    request: message,
    response,
    startTime: Date.now(),
    metadata: new Map(),
  };
}

describe('DevToolsMiddleware', () => {
  let middleware: DevToolsMiddleware;

  beforeEach(() => {
    middleware = new DevToolsMiddleware({ enabled: true });
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

      const ctx = makeCtx(message);

      // Simulate: middleware wraps core, core sets response
      await middleware.fn(ctx, async () => {
        ctx.response = response;
      });

      const messages = middleware.getStore().getMessages();
      expect(messages).toHaveLength(2);

      expect(messages[0].direction).toBe(MessageDirection.REQUEST);
      expect(messages[0].status).toBe(MessageStatus.PENDING);
      expect(messages[0].message).toEqual(message);

      expect(messages[1].direction).toBe(MessageDirection.RESPONSE);
      expect(messages[1].status).toBe(MessageStatus.SUCCESS);
      expect(messages[1].message).toEqual(response);
      expect(messages[1].duration).toBeGreaterThanOrEqual(0);
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
        error: { code: 'TEST_ERROR', message: 'Test error' },
        timestamp: Date.now(),
      };

      const ctx = makeCtx(message);

      await middleware.fn(ctx, async () => {
        ctx.response = errorResponse;
      });

      const messages = middleware.getStore().getMessages();
      expect(messages[1].status).toBe(MessageStatus.ERROR);
      expect(messages[1].message).toEqual(errorResponse);
    });

    it('should record exception', async () => {
      const message: BridgeMessage = {
        id: 'msg-1',
        action: 'testAction',
        timestamp: Date.now(),
      };

      const ctx = makeCtx(message);
      const error = new Error('Test exception');

      await expect(
        middleware.fn(ctx, async () => {
          throw error;
        })
      ).rejects.toThrow('Test exception');

      const messages = middleware.getStore().getMessages();
      expect(messages[1].status).toBe(MessageStatus.ERROR);
      expect(messages[1].stackTrace).toBeDefined();
    });
  });

  describe('filtering', () => {
    it('should filter messages based on custom filter', async () => {
      const customMiddleware = new DevToolsMiddleware({
        enabled: true,
        filter: (msg) => {
          if ('action' in msg) return msg.action !== 'filteredAction';
          return true;
        },
      });

      const filteredCtx = makeCtx({
        id: 'msg-1',
        action: 'filteredAction',
        timestamp: Date.now(),
      });

      const allowedCtx = makeCtx(
        { id: 'msg-2', action: 'allowedAction', timestamp: Date.now() },
        { id: 'msg-2', success: true, timestamp: Date.now() }
      );

      // Filtered — should pass through without recording
      await customMiddleware.fn(filteredCtx, async () => {});

      // Allowed — should record
      await customMiddleware.fn(allowedCtx, async () => {});

      const messages = customMiddleware.getStore().getMessages();
      expect(messages).toHaveLength(2); // request + response for allowedAction
      expect((messages[0].message as BridgeMessage).action).toBe('allowedAction');
    });
  });

  describe('configuration', () => {
    it('should not record when disabled', async () => {
      middleware.setEnabled(false);

      const ctx = makeCtx(
        { id: 'msg-1', action: 'testAction', timestamp: Date.now() },
        { id: 'msg-1', success: true, timestamp: Date.now() }
      );

      await runMiddleware(middleware, ctx);

      expect(middleware.getStore().getMessages()).toHaveLength(0);
    });

    it('should clear messages', async () => {
      const ctx = makeCtx(
        { id: 'msg-1', action: 'testAction', timestamp: Date.now() },
        { id: 'msg-1', success: true, timestamp: Date.now() }
      );

      await runMiddleware(middleware, ctx);
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

      const ctx = makeCtx(
        { id: 'msg-1', action: 'testAction', timestamp: Date.now() },
        { id: 'msg-1', success: true, timestamp: Date.now() }
      );

      await runMiddleware(callbackMiddleware, ctx);

      expect(onMessageMock).toHaveBeenCalledTimes(2);
    });
  });
});

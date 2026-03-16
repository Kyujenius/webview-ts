import { describe, it, expect, beforeEach } from 'vitest';
import { DevToolsMiddleware } from './DevToolsMiddleware';
import type { MiddlewareContext } from '@webview-ts/shared';
import type { TransportMessage } from '../transport/DevToolsTransport';

function makeCtx(action: string, payload?: unknown): MiddlewareContext {
  return {
    request: { id: `msg-${Date.now()}`, action, payload, timestamp: Date.now() },
    response: undefined,
    startTime: Date.now(),
    metadata: new Map(),
  };
}

describe('DevToolsMiddleware', () => {
  let middleware: DevToolsMiddleware;

  beforeEach(() => {
    middleware = new DevToolsMiddleware({ enabled: true });
  });

  describe('unified record model', () => {
    it('should record a single entry per successful call', async () => {
      const ctx = makeCtx('testAction', { test: 'data' });

      await middleware.fn(ctx, async () => {
        ctx.response = {
          id: ctx.request.id,
          success: true,
          data: { result: 'ok' },
          timestamp: Date.now(),
        };
      });

      const messages = middleware.getStore().getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].action).toBe('testAction');
      expect(messages[0].payload).toEqual({ test: 'data' });
      expect(messages[0].status).toBe('success');
      expect(messages[0].responseData).toEqual({ result: 'ok' });
      expect(messages[0].duration).toBeGreaterThanOrEqual(0);
    });

    it('should record error response', async () => {
      const ctx = makeCtx('testAction');

      await middleware.fn(ctx, async () => {
        ctx.response = {
          id: ctx.request.id,
          success: false,
          error: { code: 'TEST_ERROR', message: 'Test error' },
          timestamp: Date.now(),
        };
      });

      const messages = middleware.getStore().getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].status).toBe('error');
      expect(messages[0].error).toEqual({ code: 'TEST_ERROR', message: 'Test error' });
    });

    it('should record thrown exception', async () => {
      const ctx = makeCtx('testAction');

      await expect(
        middleware.fn(ctx, async () => {
          throw new Error('Test exception');
        })
      ).rejects.toThrow('Test exception');

      const messages = middleware.getStore().getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].status).toBe('error');
      expect(messages[0].error?.code).toBe('MIDDLEWARE_ERROR');
      expect(messages[0].stackTrace).toBeDefined();
    });

    it('should start as PENDING before next() completes', async () => {
      let capturedStatus: MessageStatus | undefined;
      const mw = new DevToolsMiddleware({
        enabled: true,
        onMessage: (record) => {
          if (!capturedStatus) capturedStatus = record.status;
        },
      });

      const ctx = makeCtx('testAction');
      await mw.fn(ctx, async () => {
        ctx.response = { id: ctx.request.id, success: true, timestamp: Date.now() };
      });

      expect(capturedStatus).toBe('pending');
    });
  });

  describe('filtering', () => {
    it('should skip recording when filter returns false', async () => {
      const filtered = new DevToolsMiddleware({
        enabled: true,
        filter: (req) => req.action !== 'skip-me',
      });

      await filtered.fn(makeCtx('skip-me'), async () => {});
      await filtered.fn(makeCtx('keep-me'), async () => {});

      const messages = filtered.getStore().getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].action).toBe('keep-me');
    });
  });

  describe('configuration', () => {
    it('should not record when disabled', async () => {
      middleware.setEnabled(false);
      await middleware.fn(makeCtx('testAction'), async () => {});
      expect(middleware.getStore().getMessages()).toHaveLength(0);
    });

    it('should clear messages', async () => {
      await middleware.fn(makeCtx('testAction'), async () => {});
      expect(middleware.getStore().getMessages()).toHaveLength(1);

      middleware.clear();
      expect(middleware.getStore().getMessages()).toHaveLength(0);
    });
  });

  describe('message callback', () => {
    it('should call onMessage twice per call (PENDING + final)', async () => {
      const statuses: string[] = [];
      const mw = new DevToolsMiddleware({
        enabled: true,
        onMessage: (record) => {
          statuses.push(record.status);
        },
      });

      const ctx = makeCtx('testAction');
      await mw.fn(ctx, async () => {
        ctx.response = { id: ctx.request.id, success: true, timestamp: Date.now() };
      });

      expect(statuses).toEqual(['pending', 'success']);
    });
  });

  describe('__skipTrace', () => {
    it('should have __skipTrace set to true', () => {
      expect(middleware.__skipTrace).toBe(true);
    });
  });

  describe('transport', () => {
    it('should send records over transport when provided', async () => {
      const sent: TransportMessage[] = [];
      const mockTransport = {
        send: (data: TransportMessage) => sent.push(data),
        onMessage: () => {},
        onDisconnect: () => {},
        connected: true,
        disconnect: () => {},
      };

      const mw = new DevToolsMiddleware({ transport: mockTransport });
      const ctx = makeCtx('test.action');
      await mw.fn(ctx, async () => {
        ctx.response = { id: ctx.request.id, success: true, timestamp: Date.now() };
      });

      expect(sent).toHaveLength(2);
      expect(sent[0]).toMatchObject({ type: 'record' });
      expect(sent[0].type === 'record' && sent[0].record.status).toBe('pending');
      expect(sent[1]).toMatchObject({ type: 'record' });
      expect(sent[1].type === 'record' && sent[1].record.status).toBe('success');
    });

    it('should send error records over transport', async () => {
      const sent: TransportMessage[] = [];
      const mockTransport = {
        send: (data: TransportMessage) => sent.push(data),
        onMessage: () => {},
        onDisconnect: () => {},
        connected: true,
        disconnect: () => {},
      };

      const mw = new DevToolsMiddleware({ transport: mockTransport });
      const ctx = makeCtx('test.action');
      await expect(
        mw.fn(ctx, async () => {
          throw new Error('boom');
        })
      ).rejects.toThrow('boom');

      expect(sent).toHaveLength(2);
      expect(sent[1].type === 'record' && sent[1].record.status).toBe('error');
    });
  });
});

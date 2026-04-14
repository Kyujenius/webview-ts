import { beforeEach, describe, expect, it } from 'vitest';

import type { TransportMessage } from '../transport/DevToolsTransport';
import type { MessageStatus } from '../types/index';
import { DevToolsMiddleware } from './DevToolsMiddleware';

type EventHandler = (data: any) => void;

function createMockTarget() {
  const handlers: Map<string, EventHandler[]> = new Map();

  return {
    onCall(event: string, handler: EventHandler): () => void {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event)!.push(handler);
      return () => {
        const list = handlers.get(event);
        if (list) {
          const idx = list.indexOf(handler);
          if (idx >= 0) list.splice(idx, 1);
        }
      };
    },
    emit(event: string, data: any) {
      const list = handlers.get(event);
      if (list) list.forEach((h) => h(data));
    },
    getHandlerCount(event: string): number {
      return handlers.get(event)?.length ?? 0;
    },
  };
}

describe('DevToolsMiddleware', () => {
  let middleware: DevToolsMiddleware;

  beforeEach(() => {
    middleware = new DevToolsMiddleware({ enabled: true });
  });

  describe('event-based recording', () => {
    it('should record a pending entry on call:start', () => {
      const target = createMockTarget();
      middleware.connect(target);

      target.emit('call:start', {
        id: 'msg-1',
        action: 'testAction',
        payload: { test: 'data' },
        timestamp: Date.now(),
      });

      const messages = middleware.getStore().getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].action).toBe('testAction');
      expect(messages[0].payload).toEqual({ test: 'data' });
      expect(messages[0].status).toBe('pending');
    });

    it('should record a success entry on call:end', () => {
      const target = createMockTarget();
      middleware.connect(target);

      target.emit('call:start', {
        id: 'msg-1',
        action: 'testAction',
        payload: { test: 'data' },
        timestamp: Date.now(),
      });

      target.emit('call:end', {
        id: 'msg-1',
        action: 'testAction',
        response: { success: true, data: { result: 'ok' } },
        duration: 42,
      });

      const messages = middleware.getStore().getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[1].status).toBe('success');
      expect(messages[1].responseData).toEqual({ result: 'ok' });
      expect(messages[1].duration).toBe(42);
    });

    it('should record error response on call:end', () => {
      const target = createMockTarget();
      middleware.connect(target);

      target.emit('call:end', {
        id: 'msg-1',
        action: 'testAction',
        response: { success: false, error: { code: 'HANDLER_ERROR', message: 'Test error' } },
        duration: 10,
      });

      const messages = middleware.getStore().getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].status).toBe('error');
      expect(messages[0].error).toEqual({ code: 'HANDLER_ERROR', message: 'Test error' });
    });

    it('should record error on call:error', () => {
      const target = createMockTarget();
      middleware.connect(target);

      target.emit('call:error', {
        id: 'msg-1',
        action: 'testAction',
        error: new Error('Test exception'),
        duration: 5,
      });

      const messages = middleware.getStore().getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].status).toBe('error');
      expect(messages[0].error?.code).toBe('CALL_ERROR');
      expect(messages[0].error?.message).toBe('Test exception');
      expect(messages[0].stackTrace).toBeDefined();
    });

    it('should start as PENDING on call:start callback', () => {
      let capturedStatus: MessageStatus | undefined;
      const mw = new DevToolsMiddleware({
        enabled: true,
        onMessage: (record) => {
          if (!capturedStatus) capturedStatus = record.status;
        },
      });

      const target = createMockTarget();
      mw.connect(target);

      target.emit('call:start', {
        id: 'msg-1',
        action: 'testAction',
        payload: undefined,
        timestamp: Date.now(),
      });

      expect(capturedStatus).toBe('pending');
    });
  });

  describe('filtering', () => {
    it('should skip recording when filter returns false', () => {
      const filtered = new DevToolsMiddleware({
        enabled: true,
        filter: (req) => req.action !== 'skip-me',
      });

      const target = createMockTarget();
      filtered.connect(target);

      target.emit('call:start', {
        id: 'msg-1',
        action: 'skip-me',
        payload: undefined,
        timestamp: Date.now(),
      });
      target.emit('call:start', {
        id: 'msg-2',
        action: 'keep-me',
        payload: undefined,
        timestamp: Date.now(),
      });

      const messages = filtered.getStore().getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].action).toBe('keep-me');
    });
  });

  describe('configuration', () => {
    it('should not record when disabled', () => {
      middleware.setEnabled(false);
      const target = createMockTarget();
      middleware.connect(target);

      target.emit('call:start', {
        id: 'msg-1',
        action: 'testAction',
        payload: undefined,
        timestamp: Date.now(),
      });

      expect(middleware.getStore().getMessages()).toHaveLength(0);
    });

    it('should clear messages', () => {
      const target = createMockTarget();
      middleware.connect(target);

      target.emit('call:start', {
        id: 'msg-1',
        action: 'testAction',
        payload: undefined,
        timestamp: Date.now(),
      });
      middleware.clear();
      expect(middleware.getStore().getMessages()).toHaveLength(0);
    });
  });

  describe('message callback', () => {
    it('should call onMessage for each event', () => {
      const statuses: string[] = [];
      const mw = new DevToolsMiddleware({
        enabled: true,
        onMessage: (record) => {
          statuses.push(record.status);
        },
      });

      const target = createMockTarget();
      mw.connect(target);

      target.emit('call:start', {
        id: 'msg-1',
        action: 'testAction',
        payload: undefined,
        timestamp: Date.now(),
      });

      target.emit('call:end', {
        id: 'msg-1',
        action: 'testAction',
        response: { success: true, data: undefined },
        duration: 10,
      });

      expect(statuses).toEqual(['pending', 'success']);
    });
  });

  describe('connect cleanup', () => {
    it('should unsubscribe all handlers when cleanup is called', () => {
      const target = createMockTarget();
      const cleanup = middleware.connect(target);

      expect(target.getHandlerCount('call:start')).toBe(1);
      expect(target.getHandlerCount('call:end')).toBe(1);
      expect(target.getHandlerCount('call:error')).toBe(1);

      cleanup();

      expect(target.getHandlerCount('call:start')).toBe(0);
      expect(target.getHandlerCount('call:end')).toBe(0);
      expect(target.getHandlerCount('call:error')).toBe(0);
    });
  });

  describe('transport', () => {
    it('should send records over transport when provided', () => {
      const sent: TransportMessage[] = [];
      const mockTransport = {
        send: (data: TransportMessage) => sent.push(data),
        onMessage: () => {},
        onDisconnect: () => {},
        connected: true,
        disconnect: () => {},
      };

      const mw = new DevToolsMiddleware({ transport: mockTransport });
      const target = createMockTarget();
      mw.connect(target);

      target.emit('call:start', {
        id: 'msg-1',
        action: 'test.action',
        payload: undefined,
        timestamp: Date.now(),
      });

      target.emit('call:end', {
        id: 'msg-1',
        action: 'test.action',
        response: { success: true, data: undefined },
        duration: 10,
      });

      expect(sent).toHaveLength(2);
      expect(sent[0]).toMatchObject({ type: 'record' });
      expect(sent[0].type === 'record' && sent[0].record.status).toBe('pending');
      expect(sent[1]).toMatchObject({ type: 'record' });
      expect(sent[1].type === 'record' && sent[1].record.status).toBe('success');
    });

    it('should send error records over transport', () => {
      const sent: TransportMessage[] = [];
      const mockTransport = {
        send: (data: TransportMessage) => sent.push(data),
        onMessage: () => {},
        onDisconnect: () => {},
        connected: true,
        disconnect: () => {},
      };

      const mw = new DevToolsMiddleware({ transport: mockTransport });
      const target = createMockTarget();
      mw.connect(target);

      target.emit('call:start', {
        id: 'msg-1',
        action: 'test.action',
        payload: undefined,
        timestamp: Date.now(),
      });

      target.emit('call:error', {
        id: 'msg-1',
        action: 'test.action',
        error: new Error('boom'),
        duration: 5,
      });

      expect(sent).toHaveLength(2);
      expect(sent[1].type === 'record' && sent[1].record.status).toBe('error');
    });
  });
});

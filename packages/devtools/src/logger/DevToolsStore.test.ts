import { describe, it, expect, beforeEach } from 'vitest';
import { DevToolsStoreImpl } from './DevToolsStore';
import type { RecordedMessage } from '../types/index';
import { MessageDirection, MessageStatus } from '../types/index';

describe('DevToolsStore', () => {
  let store: DevToolsStoreImpl;

  beforeEach(() => {
    store = new DevToolsStoreImpl(100);
  });

  describe('message management', () => {
    it('should add and retrieve messages', () => {
      const message: RecordedMessage = {
        recordId: 'record-1',
        direction: MessageDirection.REQUEST,
        status: MessageStatus.PENDING,
        message: {
          id: 'msg-1',
          action: 'testAction',
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      };

      store.addMessage(message);

      const messages = store.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(message);
    });

    it('should get message by record ID', () => {
      const message: RecordedMessage = {
        recordId: 'record-1',
        direction: MessageDirection.REQUEST,
        status: MessageStatus.PENDING,
        message: {
          id: 'msg-1',
          action: 'testAction',
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      };

      store.addMessage(message);

      const retrieved = store.getMessage('record-1');
      expect(retrieved).toEqual(message);
    });

    it('should get messages by message ID', () => {
      const request: RecordedMessage = {
        recordId: 'record-1',
        direction: MessageDirection.REQUEST,
        status: MessageStatus.PENDING,
        message: {
          id: 'msg-1',
          action: 'testAction',
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      };

      const response: RecordedMessage = {
        recordId: 'record-2',
        direction: MessageDirection.RESPONSE,
        status: MessageStatus.SUCCESS,
        message: {
          id: 'msg-1',
          success: true,
          data: { result: 'ok' },
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      };

      store.addMessage(request);
      store.addMessage(response);

      const messages = store.getMessagesByMessageId('msg-1');
      expect(messages).toHaveLength(2);
    });

    it('should clear all messages', () => {
      const message: RecordedMessage = {
        recordId: 'record-1',
        direction: MessageDirection.REQUEST,
        status: MessageStatus.PENDING,
        message: {
          id: 'msg-1',
          action: 'testAction',
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      };

      store.addMessage(message);
      expect(store.getMessages()).toHaveLength(1);

      store.clear();
      expect(store.getMessages()).toHaveLength(0);
    });

    it('should trim messages when max is exceeded', () => {
      const smallStore = new DevToolsStoreImpl(3);

      for (let i = 0; i < 5; i++) {
        smallStore.addMessage({
          recordId: `record-${i}`,
          direction: MessageDirection.REQUEST,
          status: MessageStatus.PENDING,
          message: {
            id: `msg-${i}`,
            action: 'testAction',
            timestamp: Date.now(),
          },
          timestamp: Date.now(),
        });
      }

      const messages = smallStore.getMessages();
      expect(messages).toHaveLength(3);
      expect(messages[0].recordId).toBe('record-2'); // First two should be removed
    });
  });

  describe('metrics', () => {
    it('should calculate performance metrics', () => {
      // Add success message
      store.addMessage({
        recordId: 'record-1',
        direction: MessageDirection.RESPONSE,
        status: MessageStatus.SUCCESS,
        message: {
          id: 'msg-1',
          success: true,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
        duration: 100,
      });

      // Add error message
      store.addMessage({
        recordId: 'record-2',
        direction: MessageDirection.RESPONSE,
        status: MessageStatus.ERROR,
        message: {
          id: 'msg-2',
          success: false,
          error: { code: 'ERROR', message: 'Failed' },
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
        duration: 50,
      });

      const metrics = store.getMetrics();

      expect(metrics.totalMessages).toBe(2);
      expect(metrics.averageResponseTime).toBe(75);
      expect(metrics.minResponseTime).toBe(50);
      expect(metrics.maxResponseTime).toBe(100);
      expect(metrics.successRate).toBe(0.5);
      expect(metrics.errorCount).toBe(1);
    });
  });

  describe('export/import', () => {
    it('should export messages as JSON', () => {
      const message: RecordedMessage = {
        recordId: 'record-1',
        direction: MessageDirection.REQUEST,
        status: MessageStatus.PENDING,
        message: {
          id: 'msg-1',
          action: 'testAction',
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      };

      store.addMessage(message);

      const exported = store.export();
      const parsed = JSON.parse(exported);

      expect(parsed.version).toBe('1.0');
      expect(parsed.messages).toHaveLength(1);
      expect(parsed.metrics).toBeDefined();
    });

    it('should import messages from JSON', () => {
      const message: RecordedMessage = {
        recordId: 'record-1',
        direction: MessageDirection.REQUEST,
        status: MessageStatus.PENDING,
        message: {
          id: 'msg-1',
          action: 'testAction',
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      };

      store.addMessage(message);
      const exported = store.export();

      const newStore = new DevToolsStoreImpl(100);
      newStore.import(exported);

      const messages = newStore.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].recordId).toBe('record-1');
    });
  });
});

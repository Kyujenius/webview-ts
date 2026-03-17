import { describe, it, expect, beforeEach } from 'vitest';
import { DevToolsStoreImpl } from './DevToolsStore';
import type { RecordedMessage } from '../types/index';

function makeRecord(overrides: Partial<RecordedMessage> = {}): RecordedMessage {
  return {
    recordId: `record-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status: 'pending',
    action: 'testAction',
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('DevToolsStore', () => {
  let store: DevToolsStoreImpl;

  beforeEach(() => {
    store = new DevToolsStoreImpl(100);
  });

  describe('message management', () => {
    it('should add and retrieve messages', () => {
      const message = makeRecord({ recordId: 'record-1', action: 'testAction' });
      store.addMessage(message);

      const messages = store.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(message);
    });

    it('should get message by record ID', () => {
      const message = makeRecord({ recordId: 'record-1' });
      store.addMessage(message);

      const retrieved = store.getMessage('record-1');
      expect(retrieved).toEqual(message);
    });

    it('should get messages by action name', () => {
      store.addMessage(makeRecord({ recordId: 'record-1', action: 'camera.takePhoto' }));
      store.addMessage(makeRecord({ recordId: 'record-2', action: 'storage.get' }));
      store.addMessage(makeRecord({ recordId: 'record-3', action: 'camera.takePhoto' }));

      const messages = store.getMessagesByAction('camera.takePhoto');
      expect(messages).toHaveLength(2);
    });

    it('should update message in-place', () => {
      const message = makeRecord({ recordId: 'record-1', status: 'pending' });
      store.addMessage(message);

      store.updateMessage('record-1', {
        status: 'success',
        duration: 42,
        responseData: { result: 'ok' },
      });

      const updated = store.getMessage('record-1');
      expect(updated?.status).toBe('success');
      expect(updated?.duration).toBe(42);
      expect(updated?.responseData).toEqual({ result: 'ok' });
    });

    it('should clear all messages', () => {
      store.addMessage(makeRecord({ recordId: 'record-1' }));
      expect(store.getMessages()).toHaveLength(1);

      store.clear();
      expect(store.getMessages()).toHaveLength(0);
    });

    it('should trim messages when max is exceeded', () => {
      const smallStore = new DevToolsStoreImpl(3);

      for (let i = 0; i < 5; i++) {
        smallStore.addMessage(makeRecord({ recordId: `record-${i}` }));
      }

      const messages = smallStore.getMessages();
      expect(messages).toHaveLength(3);
      expect(messages[0].recordId).toBe('record-2');
    });
  });

  describe('metrics', () => {
    it('should calculate store-level metrics', () => {
      store.addMessage(makeRecord({ recordId: 'r-1', status: 'success' }));
      store.addMessage(makeRecord({ recordId: 'r-2', status: 'error' }));
      store.addMessage(makeRecord({ recordId: 'r-3', status: 'timeout' }));

      const metrics = store.getMetrics();

      expect(metrics.totalMessages).toBe(3);
      expect(metrics.errorCount).toBe(1);
      expect(metrics.timeoutCount).toBe(1);
    });
  });

  describe('export/import', () => {
    it('should export messages as JSON', () => {
      store.addMessage(makeRecord({ recordId: 'record-1' }));

      const exported = store.export();
      const parsed = JSON.parse(exported);

      expect(parsed.version).toBe('2.0');
      expect(parsed.messages).toHaveLength(1);
      expect(parsed.metrics).toBeDefined();
    });

    it('should import messages from JSON', () => {
      store.addMessage(makeRecord({ recordId: 'record-1' }));
      const exported = store.export();

      const newStore = new DevToolsStoreImpl(100);
      newStore.import(exported);

      const messages = newStore.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].recordId).toBe('record-1');
    });
  });
});

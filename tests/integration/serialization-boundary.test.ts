import { BridgeHost } from '@webview-ts/core';
import type { HostAdapter } from '@webview-ts/shared';
import { afterEach, describe, expect, it } from 'vitest';

function createMockAdapter() {
  const listeners = new Set<(json: string) => void>();
  const sent: string[] = [];
  const adapter: HostAdapter = {
    send: (msg: string) => {
      sent.push(msg);
    },
    onMessage: (cb: (json: string) => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    destroy: () => {
      listeners.clear();
    },
  };
  return { adapter, sent };
}

describe('Serialization boundary', () => {
  let host: BridgeHost;
  let sent: string[];

  function freshHost() {
    host = new BridgeHost();
    const mock = createMockAdapter();
    sent = mock.sent;
    host.attach(mock.adapter);
    return host;
  }

  afterEach(() => host?.destroy());

  it('handleMessageString: valid JSON → response JSON', async () => {
    freshHost();
    host.registerHandler('echo', async (payload: any) => ({ echoed: payload }));

    const message = JSON.stringify({
      id: 'ser-1',
      sourceId: 'client-1',
      targetId: 'host',
      action: 'echo',
      payload: { text: 'hello' },
      timestamp: Date.now(),
    });

    await host.handleMessageString(message);

    expect(sent).toHaveLength(1);
    const response = JSON.parse(sent[0]);
    expect(response.success).toBe(true);
    expect(response.data).toEqual({ echoed: { text: 'hello' } });
  });

  it('handleMessageString: malformed JSON does not throw and sends no response', async () => {
    freshHost();

    // Should not throw — errors are handled internally via onError
    await host.handleMessageString('not-json{');

    // No response is sent for unparseable messages
    expect(sent).toHaveLength(0);
  });

  it('preserves unicode characters through round-trip', async () => {
    freshHost();
    host.registerHandler('echo', async (payload: any) => payload);

    const message = JSON.stringify({
      id: 'ser-2',
      sourceId: 'client-1',
      targetId: 'host',
      action: 'echo',
      payload: { text: '한국어 테스트 🚀', emoji: '🎉✨' },
      timestamp: Date.now(),
    });

    await host.handleMessageString(message);

    const response = JSON.parse(sent[0]);
    expect(response.data.text).toBe('한국어 테스트 🚀');
    expect(response.data.emoji).toBe('🎉✨');
  });

  it('preserves null vs undefined distinction', async () => {
    freshHost();
    host.registerHandler('echo', async (payload: any) => payload);

    const message = JSON.stringify({
      id: 'ser-3',
      sourceId: 'client-1',
      targetId: 'host',
      action: 'echo',
      payload: { present: null, zero: 0, empty: '', falsy: false },
      timestamp: Date.now(),
    });

    await host.handleMessageString(message);

    const response = JSON.parse(sent[0]);
    expect(response.data.present).toBeNull();
    expect(response.data.zero).toBe(0);
    expect(response.data.empty).toBe('');
    expect(response.data.falsy).toBe(false);
  });

  it('deeply nested objects survive serialization', async () => {
    freshHost();
    host.registerHandler('echo', async (payload: any) => payload);

    const deep = {
      level: 1,
      child: { level: 2, child: { level: 3, child: { level: 4, data: [1, 2, 3] } } },
    };
    const message = JSON.stringify({
      id: 'ser-4',
      sourceId: 'client-1',
      targetId: 'host',
      action: 'echo',
      payload: deep,
      timestamp: Date.now(),
    });

    await host.handleMessageString(message);

    const response = JSON.parse(sent[0]);
    expect(response.data).toEqual(deep);
  });

  it('error response is valid JSON with BridgeError shape', async () => {
    freshHost();
    host.registerHandler('fail', async () => {
      throw new Error('something broke');
    });

    const message = JSON.stringify({
      id: 'ser-5',
      sourceId: 'client-1',
      targetId: 'host',
      action: 'fail',
      payload: {},
      timestamp: Date.now(),
    });

    await host.handleMessageString(message);

    const response = JSON.parse(sent[0]);
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    expect(response.error.code).toBeTypeOf('string');
    expect(response.error.message).toBe('something broke');
  });

  it('unregistered action returns error response', async () => {
    freshHost();

    const message = JSON.stringify({
      id: 'ser-6',
      sourceId: 'client-1',
      targetId: 'host',
      action: 'nonexistent.action',
      payload: {},
      timestamp: Date.now(),
    });

    await host.handleMessageString(message);

    const response = JSON.parse(sent[0]);
    expect(response.success).toBe(false);
    expect(response.error.code).toBeTypeOf('string');
    expect(response.error.message).toContain('No handler registered');
  });
});

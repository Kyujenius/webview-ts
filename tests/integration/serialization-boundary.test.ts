import { describe, it, expect, afterEach } from 'vitest';
import { BridgeHost } from '@webview-ts/react-native';

describe('Serialization boundary', () => {
  let host: BridgeHost;
  const sent: string[] = [];

  function freshHost() {
    host = new BridgeHost();
    sent.length = 0;
    host.setMessageCallback((json) => sent.push(json));
    return host;
  }

  afterEach(() => host?.destroy());

  it('handleMessageString: valid JSON → response JSON', async () => {
    freshHost();
    host.registerHandler('echo', async (payload) => ({ echoed: payload }));

    const message = JSON.stringify({
      id: 'ser-1',
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
    host.registerHandler('echo', async (payload) => payload);

    const message = JSON.stringify({
      id: 'ser-2',
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
    host.registerHandler('echo', async (payload) => payload);

    const message = JSON.stringify({
      id: 'ser-3',
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
    host.registerHandler('echo', async (payload) => payload);

    const deep = {
      level: 1,
      child: { level: 2, child: { level: 3, child: { level: 4, data: [1, 2, 3] } } },
    };
    const message = JSON.stringify({
      id: 'ser-4',
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

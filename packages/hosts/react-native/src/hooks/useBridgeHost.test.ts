import { describe, expect, it, vi } from 'vitest';

vi.mock('react', () => ({
  useRef: vi.fn((val) => ({ current: val })),
  useMemo: vi.fn((fn) => fn()),
  useCallback: vi.fn((fn) => fn),
  useEffect: vi.fn((fn) => {
    fn();
  }),
}));

vi.mock('react-native', () => ({}));
vi.mock('react-native-webview', () => ({}));

import { action, definePlugin } from '@webview-ts/shared';

import { createSimpleBridgeHost } from './useBridgeHost';

type TestActions = {
  'test.echo': { payload: { message: string }; response: { echoed: string } };
  'action.one': { payload: { key: string }; response: { result: string } };
};

describe('createSimpleBridgeHost', () => {
  it('should register handlers that process messages correctly', async () => {
    const { bridgeHost } = createSimpleBridgeHost<TestActions>({
      handlers: {
        'test.echo': async (_payload) => ({ echoed: _payload.message }),
        'action.one': async (_payload) => ({ result: 'ok' }),
      },
    });

    const message = {
      id: 'test-1',
      sourceId: 'client-1',
      targetId: 'host',
      action: 'action.one',
      payload: { key: 'value' },
      timestamp: Date.now(),
    };

    const response = await bridgeHost.handleMessage(message);
    expect(response.success).toBe(true);
    if (response.success) expect(response.data).toEqual({ result: 'ok' });
  });
});

// ---- Plugin tests ----

const mockPlugin = definePlugin('mock', {
  echo: action<{ msg: string }, { echoed: string }>(),
});

describe('createSimpleBridgeHost with plugins', () => {
  it('should register plugin handlers', async () => {
    const result = createSimpleBridgeHost({
      plugins: [
        mockPlugin.host({
          echo: async (payload) => ({ echoed: payload.msg }),
        }),
      ],
    });

    const message = {
      id: 'test-1',
      sourceId: 'client-1',
      targetId: 'host',
      action: 'mock.echo',
      payload: { msg: 'hello' },
      timestamp: Date.now(),
    };

    const response = await result.bridgeHost.handleMessage(message);
    expect(response.success).toBe(true);
    if (response.success) expect(response.data).toEqual({ echoed: 'hello' });
  });

  it('should support plugins alongside handlers', async () => {
    const result = createSimpleBridgeHost({
      plugins: [
        mockPlugin.host({
          echo: async (payload) => ({ echoed: payload.msg }),
        }),
      ],
      handlers: {
        'custom.action': async () => ({ custom: true }),
      },
    });

    const pluginResponse = await result.bridgeHost.handleMessage({
      id: '1',
      sourceId: 'client-1',
      targetId: 'host',
      action: 'mock.echo',
      payload: { msg: 'hi' },
      timestamp: 0,
    });
    if (pluginResponse.success) expect(pluginResponse.data).toEqual({ echoed: 'hi' });

    const customResponse = await result.bridgeHost.handleMessage({
      id: '2',
      sourceId: 'client-1',
      targetId: 'host',
      action: 'custom.action',
      payload: {},
      timestamp: 0,
    });
    if (customResponse.success) expect(customResponse.data).toEqual({ custom: true });
  });

  it('should throw on duplicate action names', () => {
    expect(() =>
      createSimpleBridgeHost({
        plugins: [mockPlugin.host({ echo: async (p) => ({ echoed: p.msg }) })],
        handlers: {
          'mock.echo': async () => ({ echoed: 'duplicate' }),
        },
      })
    ).toThrow(/duplicate/i);
  });
});

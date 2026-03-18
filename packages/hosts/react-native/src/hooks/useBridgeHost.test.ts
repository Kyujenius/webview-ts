import { describe, it, expect, vi } from 'vitest';

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

import { createSimpleBridgeHost } from './useBridgeHost';
import { definePlugin, action } from '@webview-ts/shared';

type TestActions = {
  'test.echo': { payload: { message: string }; response: { echoed: string } };
  'action.one': { payload: { key: string }; response: { result: string } };
};

describe('createSimpleBridgeHost', () => {
  it('should create bridgeHost with webViewProps', () => {
    const result = createSimpleBridgeHost<TestActions>({
      handlers: {
        'test.echo': async (_payload) => ({ echoed: _payload.message }),
        'action.one': async (_payload) => ({ result: 'ok' }),
      },
    });

    expect(result.bridgeHost).toBeDefined();
    expect(result.messageHandler).toBeDefined();
    expect(result.webViewProps).toBeDefined();
    expect(typeof result.webViewProps.onMessage).toBe('function');
    expect(typeof result.webViewProps.ref).toBe('function');
  });

  it('should register handlers that process messages correctly', async () => {
    const { bridgeHost } = createSimpleBridgeHost<TestActions>({
      handlers: {
        'test.echo': async (_payload) => ({ echoed: _payload.message }),
        'action.one': async (_payload) => ({ result: 'ok' }),
      },
    });

    const message = {
      id: 'test-1',
      action: 'action.one',
      payload: { key: 'value' },
      timestamp: Date.now(),
    };

    const response = await bridgeHost.handleMessage(message);
    expect(response.success).toBe(true);
    expect(response.data).toEqual({ result: 'ok' });
  });

  it('should provide sendEvent function', () => {
    const { sendEvent } = createSimpleBridgeHost<TestActions>({
      handlers: {
        'test.echo': async (payload) => ({ echoed: payload.message }),
        'action.one': async () => ({ result: 'ok' }),
      },
    });
    expect(typeof sendEvent).toBe('function');
  });

  it('should work without generic (untyped fallback)', () => {
    const result = createSimpleBridgeHost({
      handlers: {
        'any.action': async (_payload: any) => ({ done: true }),
      },
    });
    expect(result.bridgeHost).toBeDefined();
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
      action: 'mock.echo',
      payload: { msg: 'hello' },
      timestamp: Date.now(),
    };

    const response = await result.bridgeHost.handleMessage(message);
    expect(response.success).toBe(true);
    expect(response.data).toEqual({ echoed: 'hello' });
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
      action: 'mock.echo',
      payload: { msg: 'hi' },
      timestamp: 0,
    });
    expect(pluginResponse.data).toEqual({ echoed: 'hi' });

    const customResponse = await result.bridgeHost.handleMessage({
      id: '2',
      action: 'custom.action',
      payload: {},
      timestamp: 0,
    });
    expect(customResponse.data).toEqual({ custom: true });
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

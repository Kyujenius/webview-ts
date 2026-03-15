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

// Typed action contract
type TestActions = {
  'test.echo': { payload: { message: string }; response: { echoed: string } };
  'action.one': { payload: { key: string }; response: { result: string } };
};

describe('createSimpleBridgeHost', () => {
  it('should create bridgeHost with webViewProps', () => {
    const result = createSimpleBridgeHost<TestActions>({
      handlers: {
        'test.echo': async (payload) => ({ echoed: payload.message }),
        'action.one': async (payload) => ({ result: 'ok' }),
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
        'test.echo': async (payload) => ({ echoed: payload.message }),
        'action.one': async (payload) => ({ result: 'ok' }),
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
        'any.action': async (payload: any) => ({ done: true }),
      },
    });
    expect(result.bridgeHost).toBeDefined();
  });
});

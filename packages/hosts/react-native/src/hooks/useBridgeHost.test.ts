import { describe, it, expect, vi } from 'vitest';

vi.mock('react', () => ({
  useRef: vi.fn((val) => ({ current: val })),
  useMemo: vi.fn((fn) => fn()),
  useCallback: vi.fn((fn) => fn),
  useEffect: vi.fn((fn) => { fn(); }),
}));

vi.mock('react-native', () => ({}));
vi.mock('react-native-webview', () => ({}));

import { createSimpleBridgeHost } from './useBridgeHost';

describe('createSimpleBridgeHost', () => {
  it('should create bridgeHost with webViewProps', () => {
    const result = createSimpleBridgeHost({
      handlers: {
        'test.echo': async (payload: any) => ({ echoed: payload.message }),
      },
    });

    expect(result.bridgeHost).toBeDefined();
    expect(result.messageHandler).toBeDefined();
    expect(result.webViewProps).toBeDefined();
    expect(typeof result.webViewProps.onMessage).toBe('function');
    expect(typeof result.webViewProps.ref).toBe('function');
  });

  it('should register handlers that process messages correctly', async () => {
    const handler = vi.fn(async (payload: any) => ({ result: 'ok' }));
    const { bridgeHost } = createSimpleBridgeHost({
      handlers: {
        'action.one': handler,
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
    const { sendEvent } = createSimpleBridgeHost({ handlers: {} });
    expect(typeof sendEvent).toBe('function');
  });
});

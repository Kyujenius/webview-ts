import { afterEach, describe, expect, it } from 'vite-plus/test';

import { createLoopbackPair } from './helpers/create-loopback-pair';

describe('Interceptor end-to-end', () => {
  let pair: ReturnType<typeof createLoopbackPair>;

  afterEach(() => pair?.destroy());

  it('request interceptors execute in registration order', async () => {
    const order: string[] = [];
    pair = createLoopbackPair({
      clientInterceptors: {
        request: [
          {
            name: 'first',
            fn: (req: any) => {
              order.push('first');
              return req;
            },
          },
          {
            name: 'second',
            fn: (req: any) => {
              order.push('second');
              return req;
            },
          },
        ],
      },
    });
    pair.registerHostHandler('test', async () => ({}));
    await pair.bridge.call('test', {});
    expect(order).toEqual(['first', 'second']);
  });

  it('request interceptor can transform payload', async () => {
    pair = createLoopbackPair({
      clientInterceptors: {
        request: [
          {
            name: 'auth',
            fn: (req: any) => ({
              ...req,
              payload: { ...(req.payload as object), token: 'abc' },
            }),
          },
        ],
      },
    });
    let receivedPayload: any;
    pair.registerHostHandler('test', async (payload) => {
      receivedPayload = payload;
      return {};
    });
    await pair.bridge.call('test', { data: 1 });
    expect(receivedPayload).toEqual({ data: 1, token: 'abc' });
  });

  it('response interceptor can transform response', async () => {
    pair = createLoopbackPair({
      clientInterceptors: {
        response: [
          {
            name: 'wrap',
            fn: (res: any) => ({
              ...res,
              data: { wrapped: true, original: res.data },
            }),
          },
        ],
      },
    });
    pair.registerHostHandler('test', async () => ({ value: 42 }));
    const result = await pair.bridge.call('test', {});
    expect(result).toEqual({ wrapped: true, original: { value: 42 } });
  });

  it('interceptor error propagates to caller', async () => {
    pair = createLoopbackPair({
      clientInterceptors: {
        request: [
          {
            name: 'bomb',
            fn: () => {
              throw new Error('interceptor exploded');
            },
          },
        ],
      },
    });
    pair.registerHostHandler('test', async () => ({}));
    await expect(pair.bridge.call('test', {})).rejects.toThrow('interceptor exploded');
  });

  it('lifecycle events are emitted', async () => {
    pair = createLoopbackPair();
    pair.registerHostHandler('test', async () => ({ ok: true }));

    const events: string[] = [];
    pair.bridge.onCall('call:start', () => events.push('start'));
    pair.bridge.onCall('call:end', () => events.push('end'));

    await pair.bridge.call('test', {});
    expect(events).toEqual(['start', 'end']);
  });
});

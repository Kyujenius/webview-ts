import type { BridgeError } from '@webview-ts/shared';
import { action, definePlugin, event } from '@webview-ts/shared';
import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createLoopbackPair } from './helpers/create-loopback-pair';

const locationContract = definePlugin(
  'location',
  { noop: action<void, void>() },
  { events: { updated: event(z.object({ lat: z.number(), lng: z.number() })) } }
);

const contract = definePlugin('camera', {
  takePhoto: action({
    payload: z.object({ quality: z.number().min(0).max(1).default(0.8) }),
    response: z.object({ uri: z.string(), takenAt: z.coerce.date() }),
  }),
});

describe('schema validation — response boundary', () => {
  it('validates and transforms the response on the client (coerce applied)', async () => {
    const { bridge, registerHostHandler, destroy } = createLoopbackPair();
    bridge.applyPlugins([contract]);
    const hostHandlers = contract.host({
      takePhoto: async ({ quality }) => ({ uri: `file://q${quality}`, takenAt: 1719970000000 }),
    });
    registerHostHandler('camera.takePhoto', hostHandlers.handlers['camera.takePhoto']);

    const result = await bridge.call('camera.takePhoto', {});
    expect(result.uri).toBe('file://q0.8'); // host saw the default
    expect(result.takenAt).toBeInstanceOf(Date); // client applied coercion

    destroy();
  });

  it('rejects a contract-violating response with VALIDATION_ERROR (client-response)', async () => {
    const { bridge, registerHostHandler, destroy } = createLoopbackPair();
    bridge.applyPlugins([contract]);
    // Simulate an outdated native host returning the wrong shape
    registerHostHandler('camera.takePhoto', async () => ({ url: 'wrong-key' }) as never);

    await expect(bridge.call('camera.takePhoto', {})).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      details: { side: 'client-response' },
    });

    destroy();
  });

  it('invalid payload is rejected by the host and surfaces on the client promise', async () => {
    const { bridge, registerHostHandler, destroy } = createLoopbackPair();
    bridge.applyPlugins([contract]);
    const hostHandlers = contract.host({
      takePhoto: async () => ({ uri: 'x', takenAt: 0 }),
    });
    registerHostHandler('camera.takePhoto', hostHandlers.handlers['camera.takePhoto']);

    await expect(bridge.call('camera.takePhoto', { quality: 9 } as never)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });

    destroy();
  });
});

describe('schema validation — event boundary', () => {
  it('delivers valid events with schema output', async () => {
    const { bridge, sendEvent, destroy } = createLoopbackPair();
    bridge.applyPlugins([locationContract]);
    const received: unknown[] = [];
    bridge.on('location.updated', (payload) => received.push(payload));

    sendEvent('location.updated', { lat: 37.5, lng: 127.0 });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(received).toEqual([{ lat: 37.5, lng: 127.0 }]);
    destroy();
  });

  it('drops invalid events and reports through onError', async () => {
    const errors: BridgeError[] = [];
    const { bridge, sendEvent, destroy } = createLoopbackPair({
      clientConfig: { onError: (error) => errors.push(error) },
    });
    bridge.applyPlugins([locationContract]);
    const received: unknown[] = [];
    bridge.on('location.updated', (payload) => received.push(payload));

    sendEvent('location.updated', { lat: 'nope' });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(received).toEqual([]); // not delivered
    expect(errors[0]?.code).toBe('VALIDATION_ERROR');
    destroy();
  });
});

const valibotContract = definePlugin('vb', {
  greet: action({
    payload: v.object({ name: v.optional(v.string(), 'anon') }),
    response: v.object({ message: v.string() }),
  }),
});

describe('schema validation — Standard Schema neutrality (valibot)', () => {
  it('round-trips with valibot schemas: default applied, response validated', async () => {
    const { bridge, registerHostHandler, destroy } = createLoopbackPair();
    bridge.applyPlugins([valibotContract]);
    const hostHandlers = valibotContract.host({
      greet: async ({ name }) => ({ message: `hi ${name}` }),
    });
    registerHostHandler('vb.greet', hostHandlers.handlers['vb.greet']);

    await expect(bridge.call('vb.greet', {})).resolves.toEqual({ message: 'hi anon' });
    destroy();
  });

  it('rejects invalid payloads identically to zod', async () => {
    const { bridge, registerHostHandler, destroy } = createLoopbackPair();
    bridge.applyPlugins([valibotContract]);
    const hostHandlers = valibotContract.host({ greet: async () => ({ message: 'x' }) });
    registerHostHandler('vb.greet', hostHandlers.handlers['vb.greet']);

    await expect(bridge.call('vb.greet', { name: 42 } as never)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    destroy();
  });
});

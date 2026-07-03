import { action, definePlugin } from '@webview-ts/shared';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createLoopbackPair } from './helpers/create-loopback-pair';

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

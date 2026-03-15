import { describe, it, expect, expectTypeOf } from 'vitest';
import { z } from 'zod';
import { defineBridgePlugin } from './typed-plugin';
import type { PluginDefinition, InferPluginActions } from './typed-plugin';

describe('Type-safe plugin definition', () => {
  it('should define plugin actions with Zod schemas', () => {
    const cameraDef: PluginDefinition = {
      name: 'camera',
      version: '1.0.0',
      actions: {
        'camera.take': {
          payload: z.object({ quality: z.number().min(0).max(1) }),
          response: z.object({ uri: z.string() }),
        },
        'camera.pick': {
          payload: z.object({ multiple: z.boolean() }),
          response: z.object({ uris: z.array(z.string()) }),
        },
      },
    };
    expect(cameraDef.name).toBe('camera');
    expect(cameraDef.actions['camera.take']).toBeDefined();
  });

  it('should infer ActionMap from plugin definition', () => {
    const def = defineBridgePlugin({
      name: 'test',
      version: '1.0.0',
      actions: {
        'test.echo': {
          payload: z.object({ message: z.string() }),
          response: z.object({ echoed: z.string() }),
        },
      },
    });
    type Actions = InferPluginActions<typeof def>;
    expectTypeOf<Actions>().toMatchTypeOf<{
      'test.echo': { payload: { message: string }; response: { echoed: string } };
    }>();
  });

  it('should return the same definition from defineBridgePlugin', () => {
    const def = defineBridgePlugin({
      name: 'test',
      version: '1.0.0',
      actions: {
        'test.ping': {
          payload: z.object({}),
          response: z.object({ pong: z.boolean() }),
        },
      },
    });
    expect(def.name).toBe('test');
    expect(def.version).toBe('1.0.0');
  });
});

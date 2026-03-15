import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineBridgePlugin } from '@ts-bridge/shared';
import { createTypedPluginAdapter } from './TypedPluginAdapter';

const testPlugin = defineBridgePlugin({
  name: 'test',
  version: '1.0.0',
  actions: {
    'test.echo': {
      payload: z.object({ message: z.string() }),
      response: z.object({ echoed: z.string() }),
    },
  },
});

describe('TypedPluginAdapter', () => {
  it('should validate payload at runtime', () => {
    const adapter = createTypedPluginAdapter(testPlugin);
    expect(() =>
      adapter.validatePayload('test.echo', { message: 'hello' }),
    ).not.toThrow();
    expect(() =>
      adapter.validatePayload('test.echo', { message: 123 }),
    ).toThrow();
  });

  it('should validate response at runtime', () => {
    const adapter = createTypedPluginAdapter(testPlugin);
    expect(() =>
      adapter.validateResponse('test.echo', { echoed: 'world' }),
    ).not.toThrow();
    expect(() =>
      adapter.validateResponse('test.echo', { echoed: 123 }),
    ).toThrow();
  });

  it('should throw for unknown action', () => {
    const adapter = createTypedPluginAdapter(testPlugin);
    expect(() =>
      adapter.validatePayload('unknown.action' as any, {}),
    ).toThrow(/Unknown action/);
  });

  it('should return parsed values (Zod strips unknown keys)', () => {
    const adapter = createTypedPluginAdapter(testPlugin);
    const result = adapter.validatePayload('test.echo', {
      message: 'hello',
      extra: 'field',
    });
    expect(result).toEqual({ message: 'hello' });
  });

  it('should list action names', () => {
    const adapter = createTypedPluginAdapter(testPlugin);
    expect(adapter.getActionNames()).toEqual(['test.echo']);
  });
});

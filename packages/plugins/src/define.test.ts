import { describe, it, expect, expectTypeOf } from 'vitest';
import { definePlugin } from './define';

type TestActions = {
  'test.echo': { payload: { message: string }; response: { echoed: string } };
  'test.greet': { payload: { name: string }; response: { greeting: string } };
};

describe('definePlugin', () => {
  const plugin = definePlugin<TestActions>({
    name: 'test',
    methods: (call) => ({
      echo: (message: string) => call('test.echo', { message }),
      greet: (name: string) => call('test.greet', { name }),
    }),
  });

  it('should preserve plugin name', () => {
    expect(plugin.name).toBe('test');
  });

  it('should have methods factory', () => {
    expect(typeof plugin.methods).toBe('function');
  });

  it('should have host function', () => {
    expect(typeof plugin.host).toBe('function');
  });

  it('should create host handlers result', () => {
    const result = plugin.host({
      'test.echo': async (payload) => ({ echoed: payload.message }),
      'test.greet': async (payload) => ({ greeting: `Hello ${payload.name}` }),
    });

    expect(result.pluginName).toBe('test');
    expect(typeof result.handlers['test.echo']).toBe('function');
    expect(typeof result.handlers['test.greet']).toBe('function');
  });

  it('.host() handlers should execute correctly', async () => {
    const result = plugin.host({
      'test.echo': async (payload) => ({ echoed: payload.message }),
      'test.greet': async (payload) => ({ greeting: `Hello ${payload.name}` }),
    });

    const echoResult = await result.handlers['test.echo']({ message: 'hi' }, { messageId: '1', timestamp: 0 });
    expect(echoResult).toEqual({ echoed: 'hi' });
  });

  it('should work without methods (contract-only)', () => {
    const contractOnly = definePlugin<TestActions>({ name: 'contract' });
    expect(contractOnly.name).toBe('contract');
    expect(typeof contractOnly.host).toBe('function');
  });
});

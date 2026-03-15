import { describe, it, expectTypeOf } from 'vitest';
import type { PluginInstance, PluginCall, HostHandlers, MergePluginActions } from './types';

type TestActions = {
  'test.echo': { payload: { message: string }; response: { echoed: string } };
  'test.add': { payload: { a: number; b: number }; response: { sum: number } };
};

describe('Plugin types', () => {
  it('PluginCall should constrain to plugin actions', () => {
    type Call = PluginCall<TestActions>;
    type EchoResult = ReturnType<(c: Call) => ReturnType<typeof c<'test.echo'>>>;
    expectTypeOf<EchoResult>().toEqualTypeOf<Promise<{ echoed: string }>>();
  });

  it('HostHandlers should require all actions', () => {
    type Handlers = HostHandlers<TestActions>;
    expectTypeOf<Handlers>().toHaveProperty('test.echo');
    expectTypeOf<Handlers>().toHaveProperty('test.add');
  });

  it('MergePluginActions should merge multiple plugins', () => {
    type ActionsA = { 'a.one': { payload: { x: number }; response: { y: number } } };
    type ActionsB = { 'b.two': { payload: { m: string }; response: { n: string } } };
    type PluginA = PluginInstance<'a', ActionsA, unknown>;
    type PluginB = PluginInstance<'b', ActionsB, unknown>;
    type Merged = MergePluginActions<[PluginA, PluginB]>;
    expectTypeOf<Merged>().toHaveProperty('a.one');
    expectTypeOf<Merged>().toHaveProperty('b.two');
  });
});

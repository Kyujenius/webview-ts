/**
 * Action cache is shared per action across ActionStateManager instances —
 * two components using the same cached action must not each hit native.
 */
import { describe, expect, it, vi } from 'vitest';

import { BridgeClient } from './BridgeClient';

describe('BridgeClient shared action cache', () => {
  it('shares cached results between managers of the same action', async () => {
    const handler = vi.fn(async () => ({ value: 42 }));
    const bridge = new BridgeClient({ fallback: { 'data.get': handler } });

    const managerA = bridge.createActionState('data.get', { cache: true });
    const managerB = bridge.createActionState('data.get', { cache: true });

    await managerA.execute({ key: 'k' });
    await managerB.execute({ key: 'k' });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(managerB.getSnapshot().data).toEqual({ value: 42 });
  });

  it('does not share cache between different actions', async () => {
    const getA = vi.fn(async () => ({ v: 'a' }));
    const getB = vi.fn(async () => ({ v: 'b' }));
    const bridge = new BridgeClient({ fallback: { 'a.get': getA, 'b.get': getB } });

    await bridge.createActionState('a.get', { cache: true }).execute(undefined);
    await bridge.createActionState('b.get', { cache: true }).execute(undefined);

    expect(getA).toHaveBeenCalledTimes(1);
    expect(getB).toHaveBeenCalledTimes(1);
  });

  it('invalidateCache on one manager invalidates for all managers of the action', async () => {
    const handler = vi.fn(async () => ({ value: 1 }));
    const bridge = new BridgeClient({ fallback: { 'data.get': handler } });

    const managerA = bridge.createActionState('data.get', { cache: true });
    const managerB = bridge.createActionState('data.get', { cache: true });

    await managerA.execute(undefined);
    managerB.invalidateCache();
    await managerA.execute(undefined);

    expect(handler).toHaveBeenCalledTimes(2);
  });
});

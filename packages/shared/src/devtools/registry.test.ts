import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AutoDevToolsTarget } from './registry';
import {
  _resetDevToolsRegistry,
  connectDevToolsTarget,
  registerDevToolsConnector,
} from './registry';

const makeTarget = (): AutoDevToolsTarget =>
  ({ onCall: vi.fn(() => () => {}) }) as unknown as AutoDevToolsTarget;

describe('devtools registry seam', () => {
  afterEach(() => {
    _resetDevToolsRegistry();
  });

  it('is a no-op until a connector registers', () => {
    const cleanup = connectDevToolsTarget(makeTarget());
    expect(typeof cleanup).toBe('function');
    cleanup(); // must not throw
  });

  it('late registration attaches to already-connected targets', () => {
    const target = makeTarget();
    connectDevToolsTarget(target);

    const connector = vi.fn(() => vi.fn());
    registerDevToolsConnector(connector);

    expect(connector).toHaveBeenCalledWith(target);
  });

  it('connector runs for targets that connect after registration', () => {
    const connector = vi.fn(() => vi.fn());
    registerDevToolsConnector(connector);

    const target = makeTarget();
    connectDevToolsTarget(target);

    expect(connector).toHaveBeenCalledWith(target);
  });

  it('cleanup from connect() runs the connector cleanup and forgets the target', () => {
    const inner = vi.fn();
    const connector = vi.fn(() => inner);
    registerDevToolsConnector(connector);

    const cleanup = connectDevToolsTarget(makeTarget());
    cleanup();

    expect(inner).toHaveBeenCalledTimes(1);
    // a new registration must not re-attach to the removed target
    registerDevToolsConnector(connector);
    expect(connector).toHaveBeenCalledTimes(1);
  });
});

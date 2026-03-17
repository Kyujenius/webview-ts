import { describe, it, expect } from 'vitest';
import { BridgeCallError } from './errors';

describe('BridgeCallError', () => {
  it('should carry code and details', () => {
    const err = new BridgeCallError('fail', 'TIMEOUT', { elapsed: 5000 });
    expect(err.message).toBe('fail');
    expect(err.code).toBe('TIMEOUT');
    expect(err.details).toEqual({ elapsed: 5000 });
    expect(err instanceof Error).toBe(true);
  });
});

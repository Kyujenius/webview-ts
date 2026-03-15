import { describe, it, expect } from 'vitest';
import { haptics } from './haptics';

describe('haptics preset', () => {
  it('should have correct name', () => { expect(haptics.name).toBe('haptics'); });
  it('.host() should create handlers', () => {
    const result = haptics.host({
      'haptics.impact': async () => ({}),
      'haptics.notification': async () => ({}),
      'haptics.selection': async () => ({}),
    });
    expect(Object.keys(result.handlers).length).toBe(3);
  });
});

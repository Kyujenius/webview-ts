import { describe, it, expect } from 'vitest';
import { biometric } from './biometric';

describe('biometric preset', () => {
  it('should have correct name', () => { expect(biometric.name).toBe('biometric'); });
  it('.host() should create handlers', () => {
    const result = biometric.host({
      'biometric.checkAvailability': async () => ({ available: true, biometricTypes: ['face'] }),
      'biometric.authenticate': async () => ({ success: true }),
    });
    expect(Object.keys(result.handlers).length).toBe(2);
  });
});

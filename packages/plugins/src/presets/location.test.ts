import { describe, it, expect } from 'vitest';
import { location } from './location';

describe('location preset', () => {
  it('should have correct name', () => { expect(location.name).toBe('location'); });
  it('.host() should create handlers', () => {
    const result = location.host({
      'location.getCurrentPosition': async () => ({ latitude: 0, longitude: 0, accuracy: 0 }),
      'location.watchPosition': async () => ({ watchId: 1 }),
      'location.clearWatch': async () => ({}),
    });
    expect(Object.keys(result.handlers).length).toBe(3);
  });
});

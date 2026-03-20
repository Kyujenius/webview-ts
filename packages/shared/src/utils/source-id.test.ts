import { describe, it, expect } from 'vitest';
import { generateSourceId } from './source-id';

describe('generateSourceId', () => {
  it('generates id with name prefix when name provided', () => {
    const id = generateSourceId('checkout');
    expect(id).toMatch(/^checkout-[a-z0-9]+$/);
  });

  it('generates id with default prefix when no name', () => {
    const id = generateSourceId();
    expect(id).toMatch(/^bridge-[a-z0-9]+$/);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateSourceId()));
    expect(ids.size).toBe(100);
  });
});

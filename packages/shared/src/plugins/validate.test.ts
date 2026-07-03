import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { BridgeCallError } from '../types/errors';
import { validateWithSchema } from './validate';

describe('validateWithSchema', () => {
  const schema = z.object({ quality: z.number().min(0).max(1).default(0.8) });

  it('returns schema output — defaults applied', () => {
    expect(validateWithSchema(schema, {}, 'host-payload', 'camera.takePhoto')).toEqual({
      quality: 0.8,
    });
  });

  it('throws BridgeCallError with VALIDATION_ERROR code and JSON-safe issues', () => {
    try {
      validateWithSchema(schema, { quality: 'high' }, 'host-payload', 'camera.takePhoto');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(BridgeCallError);
      const err = error as BridgeCallError;
      expect(err.code).toBe('VALIDATION_ERROR');
      const details = err.details as {
        side: string;
        issues: { message: string; path?: (string | number)[] }[];
      };
      expect(details.side).toBe('host-payload');
      expect(details.issues.length).toBeGreaterThan(0);
      expect(details.issues[0].path).toEqual(['quality']);
      // details must survive JSON serialization (crosses the bridge)
      expect(JSON.parse(JSON.stringify(details))).toEqual(details);
      // raw input value must NOT be included
      expect(JSON.stringify(details)).not.toContain('high');
    }
  });

  it('rejects async schemas with a clear error', () => {
    const asyncSchema = z.object({ v: z.string() }).refine(async () => true);
    expect(() =>
      validateWithSchema(asyncSchema, { v: 'x' }, 'client-response', 'a.b')
    ).toThrowError(/[Aa]sync/);
  });
});

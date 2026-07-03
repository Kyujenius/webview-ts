import { BridgeCallError } from '../types/errors';
import type { StandardSchemaV1 } from '../types/standard-schema';

export type ValidationSide = 'host-payload' | 'client-response' | 'client-event';

/** JSON-serializable issue — crosses the bridge inside BridgeError.details */
export interface ValidationIssue {
  message: string;
  path?: (string | number)[];
}

function normalizeIssues(issues: ReadonlyArray<StandardSchemaV1.Issue>): ValidationIssue[] {
  return issues.map((issue) => {
    const path = issue.path?.map((segment) => {
      const key = typeof segment === 'object' && segment !== null ? segment.key : segment;
      return typeof key === 'number' ? key : String(key);
    });
    return path && path.length > 0 ? { message: issue.message, path } : { message: issue.message };
  });
}

/**
 * Validate a value at a receiving boundary and return the schema OUTPUT
 * (so .default()/.transform() take effect). Never includes the raw value
 * in the thrown error — issues carry message + path only.
 */
export function validateWithSchema<T>(
  schema: StandardSchemaV1<unknown, T>,
  value: unknown,
  side: ValidationSide,
  subject: string
): T {
  const result = schema['~standard'].validate(value);
  if (result instanceof Promise) {
    throw new BridgeCallError(
      `Async schema validation is not supported (${subject}). Use a synchronous schema.`,
      'VALIDATION_ERROR',
      { side, issues: [] }
    );
  }
  if (result.issues) {
    throw new BridgeCallError(`Validation failed for ${subject}`, 'VALIDATION_ERROR', {
      side,
      issues: normalizeIssues(result.issues),
    });
  }
  return result.value;
}

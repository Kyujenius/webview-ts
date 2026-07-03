export type BridgeErrorCode =
  | 'TIMEOUT'
  | 'HANDLER_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'NATIVE_UNAVAILABLE'
  | 'HANDLER_ERROR'
  | 'NETWORK_ERROR'
  | 'MIDDLEWARE_ERROR'
  | 'FALLBACK_ERROR'
  | 'NO_FALLBACK'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

export class BridgeCallError extends Error {
  readonly code: BridgeErrorCode;
  readonly details?: unknown;

  constructor(message: string, code: BridgeErrorCode, details?: unknown) {
    super(message);
    this.name = 'BridgeCallError';
    this.code = code;
    this.details = details;
  }
}

const VALID_ERROR_CODES: Set<string> = new Set([
  'TIMEOUT',
  'HANDLER_NOT_FOUND',
  'PERMISSION_DENIED',
  'NATIVE_UNAVAILABLE',
  'HANDLER_ERROR',
  'NETWORK_ERROR',
  'MIDDLEWARE_ERROR',
  'FALLBACK_ERROR',
  'NO_FALLBACK',
  'VALIDATION_ERROR',
  'UNKNOWN_ERROR',
]);

export function toBridgeErrorCode(code: unknown): BridgeErrorCode {
  return typeof code === 'string' && VALID_ERROR_CODES.has(code)
    ? (code as BridgeErrorCode)
    : 'UNKNOWN_ERROR';
}

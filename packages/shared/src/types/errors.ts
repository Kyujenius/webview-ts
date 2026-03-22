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
  'UNKNOWN_ERROR',
]);

export function toBridgeErrorCode(code: unknown): BridgeErrorCode {
  return typeof code === 'string' && VALID_ERROR_CODES.has(code)
    ? (code as BridgeErrorCode)
    : 'UNKNOWN_ERROR';
}

export type ErrorCategory = 'transient' | 'client' | 'server' | 'auth';

const ERROR_CATEGORY: Record<BridgeErrorCode, ErrorCategory> = {
  TIMEOUT: 'transient',
  NETWORK_ERROR: 'transient',
  HANDLER_NOT_FOUND: 'server',
  HANDLER_ERROR: 'server',
  MIDDLEWARE_ERROR: 'server',
  PERMISSION_DENIED: 'auth',
  NATIVE_UNAVAILABLE: 'client',
  FALLBACK_ERROR: 'client',
  NO_FALLBACK: 'client',
  UNKNOWN_ERROR: 'server',
};

export function getErrorCategory(error: BridgeCallError): ErrorCategory {
  return ERROR_CATEGORY[error.code];
}

export function isRetryable(error: BridgeCallError): boolean {
  return getErrorCategory(error) === 'transient';
}

export function isAuthError(error: BridgeCallError): boolean {
  return getErrorCategory(error) === 'auth';
}

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
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'BridgeCallError';
    this.code = code;
    this.details = details;
  }
}

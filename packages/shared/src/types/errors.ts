/**
 * Bridge error codes as a runtime constant — the single definition the
 * union type, the validator set, and user code (retryIf, onError branching)
 * all derive from. Mirrors the TARGET constant's style:
 *
 * ```ts
 * retry: { maxAttempts: 3, delay: 300, retryIf: (e) => e.code === ERROR_CODE.TIMEOUT }
 * ```
 */
export const ERROR_CODE = {
  /** The call exceeded its timeout */
  TIMEOUT: 'TIMEOUT',
  /** No handler is registered for the action on the host */
  HANDLER_NOT_FOUND: 'HANDLER_NOT_FOUND',
  /** The host refused the action */
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  /** No live transport and no fallback took over */
  NATIVE_UNAVAILABLE: 'NATIVE_UNAVAILABLE',
  /** The host handler threw */
  HANDLER_ERROR: 'HANDLER_ERROR',
  /** A network operation inside a handler failed */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** An interceptor threw */
  MIDDLEWARE_ERROR: 'MIDDLEWARE_ERROR',
  /** A fallback mock handler threw */
  FALLBACK_ERROR: 'FALLBACK_ERROR',
  /** Fallback mode is active but has no handler for the action */
  NO_FALLBACK: 'NO_FALLBACK',
  /** A payload/response/event failed schema validation */
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  /** The caller aborted the wait via BridgeCallOptions.signal */
  ABORTED: 'ABORTED',
  /** Anything not classified above */
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type BridgeErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

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

const VALID_ERROR_CODES: Set<string> = new Set(Object.values(ERROR_CODE));

/** Errors that retrying can never fix within a session — skipped by default
 *  (see RetryConfig.retryIf). The adapter and fallback map are fixed at
 *  construction, so availability failures are deterministic too. */
export const NON_RETRYABLE_ERROR_CODES: ReadonlySet<string> = new Set([
  ERROR_CODE.VALIDATION_ERROR,
  ERROR_CODE.HANDLER_NOT_FOUND,
  ERROR_CODE.NATIVE_UNAVAILABLE,
  ERROR_CODE.NO_FALLBACK,
  ERROR_CODE.ABORTED, // user-initiated — retrying would defy the abort
]);

export function toBridgeErrorCode(code: unknown): BridgeErrorCode {
  return typeof code === 'string' && VALID_ERROR_CODES.has(code)
    ? (code as BridgeErrorCode)
    : 'UNKNOWN_ERROR';
}

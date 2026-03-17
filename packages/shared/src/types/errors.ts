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

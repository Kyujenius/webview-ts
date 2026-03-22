export function statusColor(s: string): string {
  switch (s) {
    case 'success':
      return '#22c55e';
    case 'error':
      return '#ef4444';
    case 'pending':
      return '#3b82f6';
    case 'timeout':
      return '#f97316';
    case 'event':
      return '#a855f7';
    default:
      return '#64748b';
  }
}

export function errorCodeColor(code: string): string {
  switch (code) {
    case 'TIMEOUT':
    case 'NETWORK_ERROR':
      return '#f97316'; // orange — retryable
    case 'HANDLER_NOT_FOUND':
    case 'HANDLER_ERROR':
    case 'UNKNOWN_ERROR':
      return '#ef4444'; // red — server
    case 'PERMISSION_DENIED':
      return '#a855f7'; // purple — auth
    case 'NATIVE_UNAVAILABLE':
    case 'FALLBACK_ERROR':
    case 'NO_FALLBACK':
      return '#64748b'; // gray — client
    case 'MIDDLEWARE_ERROR':
      return '#eab308'; // yellow — middleware
    default:
      return '#ef4444';
  }
}

export function errorCodeIcon(code: string): string {
  switch (code) {
    case 'TIMEOUT':
      return '\u23F1';
    case 'HANDLER_NOT_FOUND':
      return '\u2753';
    case 'PERMISSION_DENIED':
      return '\uD83D\uDD12';
    case 'NATIVE_UNAVAILABLE':
      return '\uD83D\uDCF5';
    case 'HANDLER_ERROR':
      return '\uD83D\uDCA5';
    case 'NETWORK_ERROR':
      return '\uD83C\uDF10';
    case 'MIDDLEWARE_ERROR':
      return '\u2699\uFE0F';
    case 'FALLBACK_ERROR':
      return '\uD83D\uDEE0\uFE0F';
    case 'NO_FALLBACK':
      return '\u26A0\uFE0F';
    default:
      return '\u2753';
  }
}

export function statusIcon(s: string): string {
  switch (s) {
    case 'success':
      return '\u2713';
    case 'error':
      return '\u2717';
    case 'pending':
      return '\u25CB';
    case 'timeout':
      return '\u23F1';
    case 'event':
      return '\u26A1';
    default:
      return '\u2022';
  }
}

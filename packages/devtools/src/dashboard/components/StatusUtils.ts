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

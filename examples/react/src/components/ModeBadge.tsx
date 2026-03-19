type ConnectionMode = 'native' | 'fallback' | 'disconnected';

const MODE_CONFIG: Record<ConnectionMode, { className: string; label: string }> = {
  native: { className: 'status-connected', label: 'Native Bridge' },
  fallback: { className: 'status-fallback', label: 'Fallback' },
  disconnected: { className: 'status-disconnected', label: 'Disconnected' },
};

export function getModeLabel(connectionMode: ConnectionMode, fallbackLabel?: string): string {
  const config = MODE_CONFIG[connectionMode];
  if (fallbackLabel && connectionMode === 'fallback') {
    return `Fallback (${fallbackLabel})`;
  }
  return config.label;
}

export function getModeClassName(connectionMode: ConnectionMode): string {
  return MODE_CONFIG[connectionMode].className;
}

interface ModeBadgeProps {
  connectionMode: ConnectionMode;
  fallbackLabel?: string;
}

function ModeBadge({ connectionMode, fallbackLabel }: ModeBadgeProps) {
  return <p className="mode-badge">{getModeLabel(connectionMode, fallbackLabel)}</p>;
}

export default ModeBadge;

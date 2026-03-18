interface Stats {
  total: number;
  rate: number;
  errs: number;
  events: number;
  avg: string;
}

interface ToolbarProps {
  stats: Stats;
  connected: boolean;
  onClear: () => void;
}

export function Toolbar({ stats, connected, onClear }: ToolbarProps) {
  return (
    <div id="toolbar">
      <h1>webview-ts DevTools</h1>
      <div id="stats">
        <span>
          Total: <span className="stat-val">{stats.total}</span>
        </span>
        <span>
          OK:{' '}
          <span className="stat-val" style={{ color: '#22c55e' }}>
            {stats.rate}%
          </span>
        </span>
        <span>
          Err:{' '}
          <span className="stat-val" style={{ color: '#ef4444' }}>
            {stats.errs}
          </span>
        </span>
        <span>
          Events:{' '}
          <span className="stat-val" style={{ color: '#a855f7' }}>
            {stats.events}
          </span>
        </span>
        <span>
          Avg: <span className="stat-val">{stats.avg}ms</span>
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span id="conn" className={connected ? 'on' : 'off'}>
          {connected ? 'connected' : 'disconnected'}
        </span>
        <button onClick={onClear}>Clear</button>
      </div>
    </div>
  );
}

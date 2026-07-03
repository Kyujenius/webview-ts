import { camera, haptics, location } from '@example/plugins';
import { useEffect, useState } from 'react';

import { useBridge, usePlugin } from '../bridge';

interface LogEntry {
  id: string;
  action: string;
  status: 'running' | 'success' | 'error';
  duration?: number;
  timestamp: number;
}

export default function LifecyclePage() {
  const { bridge } = useBridge();
  const { impact } = usePlugin(haptics);
  const { takePhoto } = usePlugin(camera);
  const { getCurrentPosition } = usePlugin(location);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const unsubStart = bridge.onCall('call:start', (data) => {
      setLogs((prev) => [
        { id: data.id, action: data.action, status: 'running', timestamp: data.timestamp },
        ...prev.slice(0, 19),
      ]);
    });

    const unsubEnd = bridge.onCall('call:end', (data) => {
      setLogs((prev) =>
        prev.map((entry) =>
          entry.id === data.id ? { ...entry, status: 'success', duration: data.duration } : entry
        )
      );
    });

    const unsubError = bridge.onCall('call:error', (data) => {
      setLogs((prev) =>
        prev.map((entry) =>
          entry.id === data.id ? { ...entry, status: 'error', duration: data.duration } : entry
        )
      );
    });

    return () => {
      unsubStart();
      unsubEnd();
      unsubError();
    };
  }, [bridge]);

  const handleHapticsImpact = () => {
    impact.execute({ style: 'medium' }).catch(() => {});
  };

  const handleTakePhoto = () => {
    takePhoto.execute({ quality: 0.8, includeBase64: false }).catch(() => {});
  };

  const handleGetLocation = () => {
    getCurrentPosition.execute().catch(() => {});
  };

  const statusColor = (status: LogEntry['status']) => {
    if (status === 'success') return '#22c55e';
    if (status === 'error') return '#ef4444';
    return '#f59e0b';
  };

  const statusLabel = (status: LogEntry['status']) => {
    if (status === 'success') return 'success';
    if (status === 'error') return 'error';
    return 'running…';
  };

  return (
    <div>
      <h1>Call Lifecycle</h1>
      <p className="description">
        Subscribes to <code>call:start</code>, <code>call:end</code>, and <code>call:error</code>{' '}
        events via <code>bridge.onCall()</code>. Every bridge call—from any plugin—appears in the
        log below in real time.
      </p>

      <div className="card">
        <h2>Trigger Actions</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="button" onClick={handleHapticsImpact}>
            haptics.impact
          </button>
          <button className="button button-secondary" onClick={handleTakePhoto}>
            camera.takePhoto
          </button>
          <button className="button button-secondary" onClick={handleGetLocation}>
            location.getCurrentPosition
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Live Call Log</h2>
        {logs.length === 0 ? (
          <div className="result">No calls yet. Click a button above.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '4px 8px' }}>Action</th>
                <th style={{ padding: '4px 8px' }}>Status</th>
                <th style={{ padding: '4px 8px' }}>Duration</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{entry.action}</td>
                  <td style={{ padding: '4px 8px', color: statusColor(entry.status) }}>
                    {statusLabel(entry.status)}
                  </td>
                  <td style={{ padding: '4px 8px', color: '#6b7280' }}>
                    {entry.duration != null ? `${entry.duration}ms` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Code</h2>
        <pre style={{ fontSize: 11 }}>
          {`const { bridge } = useBridge();

useEffect(() => {
  const unsubStart = bridge.onCall('call:start', (data) => {
    // data: { id, action, payload, timestamp }
  });
  const unsubEnd = bridge.onCall('call:end', (data) => {
    // data: { id, action, response, duration }
  });
  const unsubError = bridge.onCall('call:error', (data) => {
    // data: { id, action, error, duration }
  });

  return () => {
    unsubStart();
    unsubEnd();
    unsubError();
  };
}, [bridge]);`}
        </pre>
      </div>
    </div>
  );
}

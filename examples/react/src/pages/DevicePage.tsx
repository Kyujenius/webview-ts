import type { AppStateStatus, DeviceInfoResponse } from '@example/plugins';
import { device } from '@example/plugins';
import { useState } from 'react';

import { useBridge, usePlugin } from '../bridge';
import ActionError from '../components/ActionError';
import ModeBadge from '../components/ModeBadge';

function DevicePage() {
  const { connectionMode } = useBridge();
  const { getInfo, on } = usePlugin(device);
  const [appState, setAppState] = useState<AppStateStatus | null>(null);

  on('appStateChanged', (state: AppStateStatus) => {
    setAppState(state);
  });

  const handleGetInfo = () => getInfo.execute();

  const info = getInfo.data ? (getInfo.data as DeviceInfoResponse) : null;

  return (
    <div>
      <h1>Device Plugin</h1>
      <ModeBadge connectionMode={connectionMode} fallbackLabel="Web" />

      <div className="card">
        <h2>Device Information</h2>
        <button onClick={handleGetInfo}>Get Device Info</button>

        {info && (
          <div className="result" style={{ marginTop: '1rem' }}>
            <table className="info-table">
              <tbody>
                {Object.entries(info).map(([key, value]) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>{String(value ?? 'N/A')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>App State (Event)</h2>
        <p style={{ color: '#94a3b8', fontSize: 14, margin: '0.5rem 0' }}>
          Press "Get Device Info" first to start listening, then background/foreground the RN app.
        </p>
        {appState ? (
          <div className="result">
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 14,
                background:
                  appState === 'active'
                    ? '#22c55e'
                    : appState === 'background'
                      ? '#f97316'
                      : '#64748b',
                color: '#fff',
              }}
            >
              {appState}
            </span>
          </div>
        ) : (
          <div className="result" style={{ color: '#64748b' }}>
            Waiting for state change...
          </div>
        )}
      </div>

      <ActionError error={getInfo.error} />
    </div>
  );
}

export default DevicePage;

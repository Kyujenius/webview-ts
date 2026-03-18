import { useState } from 'react';
import { useAction, usePlugin } from '../bridge';
import { device } from '@example/plugins';

// useAction: manages a single action state by full action name
// usePlugin: subscribes to all action states of a plugin at once

function ActionsPage() {
  // --- useAction examples ---
  const deviceInfo = useAction('device.getInfo');
  const takePhoto = useAction('camera.takePhoto');

  // --- usePlugin equivalent (same actions, plugin-grouped) ---
  const { getInfo: pluginGetInfo } = usePlugin(device);

  const [quality, setQuality] = useState(0.8);

  return (
    <div>
      <h1>useAction vs usePlugin</h1>

      <div className="card">
        <h2>useAction — Single Action</h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          Manages a single action state by full action name.
          <br />
          Analogous to <code>useQuery()</code> from TanStack Query.
        </p>
        <pre
          style={{
            background: '#f8f9fa',
            padding: '1rem',
            borderRadius: '6px',
            fontSize: '0.85rem',
          }}
        >{`const deviceInfo = useAction('device.getInfo');
const takePhoto  = useAction('camera.takePhoto');

deviceInfo.execute();                // void payload
takePhoto.execute({ quality: 0.8 }); // typed payload
deviceInfo.data      // DeviceInfoResponse | null
deviceInfo.isLoading // boolean
deviceInfo.status    // 'idle' | 'loading' | 'success' | 'error'
deviceInfo.error     // Error | null
deviceInfo.reset()   // reset state`}</pre>
      </div>

      <div className="card">
        <h2>Device Info</h2>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
          <code>useAction('device.getInfo')</code>
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            className="button"
            onClick={() => deviceInfo.execute()}
            disabled={deviceInfo.isLoading}
          >
            {deviceInfo.isLoading ? 'Loading...' : 'Get Device Info'}
          </button>
          {deviceInfo.data && (
            <button className="button button-secondary" onClick={() => deviceInfo.reset()}>
              Reset
            </button>
          )}
          <StatusBadge status={deviceInfo.status} />
        </div>

        {deviceInfo.error && (
          <div className="result error" style={{ marginTop: '0.75rem' }}>
            {deviceInfo.error.message}
          </div>
        )}

        {deviceInfo.data && (
          <div className="result success" style={{ marginTop: '0.75rem' }}>
            <pre style={{ margin: 0 }}>{JSON.stringify(deviceInfo.data, null, 2)}</pre>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Take Photo</h2>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
          <code>useAction('camera.takePhoto')</code>
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
          >
            Quality:
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              style={{ width: '100px' }}
            />
            {quality}
          </label>
          <button
            className="button"
            onClick={() => takePhoto.execute({ quality })}
            disabled={takePhoto.isLoading}
          >
            {takePhoto.isLoading ? 'Loading...' : 'Take Photo'}
          </button>
          {takePhoto.data && (
            <button className="button button-secondary" onClick={() => takePhoto.reset()}>
              Reset
            </button>
          )}
          <StatusBadge status={takePhoto.status} />
        </div>

        {takePhoto.error && (
          <div className="result error" style={{ marginTop: '0.75rem' }}>
            {takePhoto.error.message}
          </div>
        )}

        {takePhoto.data && (
          <div className="result success" style={{ marginTop: '0.75rem' }}>
            <pre style={{ margin: 0 }}>{JSON.stringify(takePhoto.data, null, 2)}</pre>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Comparison with usePlugin</h2>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
          Same as <code>useAction('device.getInfo')</code> above — via{' '}
          <code>usePlugin(device).getInfo</code>
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            className="button"
            onClick={() => pluginGetInfo.execute()}
            disabled={pluginGetInfo.isLoading}
          >
            {pluginGetInfo.isLoading ? 'Loading...' : 'Get Device Info (via usePlugin)'}
          </button>
          <StatusBadge status={pluginGetInfo.status} />
        </div>

        {pluginGetInfo.data && (
          <div className="result success" style={{ marginTop: '0.75rem' }}>
            <pre style={{ margin: 0 }}>{JSON.stringify(pluginGetInfo.data, null, 2)}</pre>
          </div>
        )}

        <div style={{ marginTop: '1.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    borderBottom: '2px solid #dee2e6',
                  }}
                >
                  &nbsp;
                </th>
                <th
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    borderBottom: '2px solid #dee2e6',
                  }}
                >
                  useAction
                </th>
                <th
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    borderBottom: '2px solid #dee2e6',
                  }}
                >
                  usePlugin
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Argument', "useAction('device.getInfo')", 'usePlugin(device)'],
                ['Returns', '{ execute, data, ... }', '{ getInfo, getBattery, ... }'],
                ['Scope', 'Single action', 'All actions in plugin'],
                ['Analogy', 'useQuery()', 'useQueries([...])'],
                ['Events', 'No', '.on("eventName", handler)'],
                ['Best for', 'Using 1–2 actions selectively', 'Using the full plugin'],
              ].map(([label, a, b]) => (
                <tr key={label} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px 12px', fontWeight: 500, color: '#555' }}>{label}</td>
                  <td
                    style={{
                      padding: '6px 12px',
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                    }}
                  >
                    {a}
                  </td>
                  <td
                    style={{
                      padding: '6px 12px',
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                    }}
                  >
                    {b}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle: '#e2e8f0',
    loading: '#fef3c7',
    success: '#d1fae5',
    error: '#fee2e2',
  };
  return (
    <span
      style={{
        fontSize: '0.8rem',
        padding: '2px 8px',
        borderRadius: '4px',
        background: colors[status] ?? '#e2e8f0',
      }}
    >
      status: {status}
    </span>
  );
}

export default ActionsPage;

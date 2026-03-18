import { useAction, usePlugin } from '../bridge';
import { device } from '@example/plugins';

function ActionsPage() {
  const deviceInfo = useAction('device.getInfo');
  const { getInfo } = usePlugin(device);

  return (
    <div>
      <h1>useAction vs usePlugin</h1>

      <div className="card">
        <h2>useAction</h2>
        <pre>{`// Subscribe to a single action by full name
const deviceInfo = useAction('device.getInfo');

deviceInfo.execute()   // trigger
deviceInfo.data        // response | null
deviceInfo.isLoading   // boolean
deviceInfo.error       // Error | null
deviceInfo.status      // 'idle' | 'loading' | 'success' | 'error'
deviceInfo.reset()     // clear state`}</pre>
        <button onClick={() => deviceInfo.execute()} disabled={deviceInfo.isLoading}>
          {deviceInfo.isLoading ? 'Loading...' : 'Get Device Info'}
        </button>
        {deviceInfo.data && (
          <pre className="result success" style={{ marginTop: '0.75rem' }}>
            {JSON.stringify(deviceInfo.data, null, 2)}
          </pre>
        )}
        {deviceInfo.error && (
          <p className="result error" style={{ marginTop: '0.75rem' }}>
            {deviceInfo.error.message}
          </p>
        )}
      </div>

      <div className="card">
        <h2>usePlugin</h2>
        <pre>{`// Subscribe to all actions of a plugin at once
const { getInfo, getBattery } = usePlugin(device);

getInfo.execute()   // same shape per action
getInfo.data
getInfo.isLoading
getInfo.error
getInfo.status
getInfo.reset()`}</pre>
        <button onClick={() => getInfo.execute()} disabled={getInfo.isLoading}>
          {getInfo.isLoading ? 'Loading...' : 'Get Device Info'}
        </button>
        {getInfo.data && (
          <pre className="result success" style={{ marginTop: '0.75rem' }}>
            {JSON.stringify(getInfo.data, null, 2)}
          </pre>
        )}
        {getInfo.error && (
          <p className="result error" style={{ marginTop: '0.75rem' }}>
            {getInfo.error.message}
          </p>
        )}
      </div>

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th
                style={{
                  padding: '8px 12px',
                  textAlign: 'left',
                  borderBottom: '2px solid #dee2e6',
                }}
              />
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
              ['Scope', 'single action', 'all actions in a plugin'],
              ['Argument', "useAction('device.getInfo')", 'usePlugin(device)'],
              ['Returns', '{ execute, data, … }', '{ getInfo, getBattery, … }'],
              ['Events', '—', '.on("name", handler)'],
              ['Analogy', 'useQuery()', 'useQueries([…])'],
            ].map(([label, a, b]) => (
              <tr key={label} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '6px 12px', fontWeight: 500, color: '#555' }}>{label}</td>
                <td style={{ padding: '6px 12px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {a}
                </td>
                <td style={{ padding: '6px 12px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {b}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ActionsPage;

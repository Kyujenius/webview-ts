import { device } from '@example/plugins';

import { useAction, usePlugin } from '../bridge';
import ActionError from '../components/ActionError';

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
        <ActionError error={deviceInfo.error} />
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
        <ActionError error={getInfo.error} />
      </div>

      <div className="card">
        <table className="compare-table">
          <thead>
            <tr>
              <th />
              <th>useAction</th>
              <th>usePlugin</th>
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
              <tr key={label}>
                <td>{label}</td>
                <td>{a}</td>
                <td>{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ActionsPage;

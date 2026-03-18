import { usePlugin, useBridge } from '../bridge';
import { device } from '@example/plugins';

function DevicePage() {
  const { connectionMode } = useBridge();
  const { getInfo } = usePlugin(device);

  const handleGetInfo = () => getInfo.execute();

  const info = getInfo.data ? (getInfo.data as unknown as Record<string, unknown>) : null;

  return (
    <div>
      <h1>Device Plugin</h1>
      <p className="mode-badge">
        {connectionMode === 'native'
          ? 'Native Bridge'
          : connectionMode === 'fallback'
            ? 'Fallback (Web)'
            : 'Disconnected'}
      </p>

      <div className="card">
        <h2>Device Information</h2>
        <button onClick={handleGetInfo}>Get Device Info</button>

        {info && (
          <div className="result" style={{ marginTop: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {Object.entries(info).map(([key, value]) => (
                  <tr key={key} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 500, color: '#666' }}>{key}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>
                      {String(value ?? 'N/A')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {getInfo.error && <div className="result error">{getInfo.error.message}</div>}
    </div>
  );
}

export default DevicePage;

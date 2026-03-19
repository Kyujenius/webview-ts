import { usePlugin, useBridge } from '../bridge';
import { device } from '@example/plugins';
import type { DeviceInfoResponse } from '@example/plugins';
import ModeBadge from '../components/ModeBadge';
import ActionError from '../components/ActionError';

function DevicePage() {
  const { connectionMode } = useBridge();
  const { getInfo } = usePlugin(device);

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

      <ActionError error={getInfo.error} />
    </div>
  );
}

export default DevicePage;

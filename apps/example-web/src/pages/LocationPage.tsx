import { useState } from 'react';
import { location } from '@ts-bridge/plugins';
import { usePlugin, useBridge } from '../bridge';

function LocationPage() {
  const { getCurrentPosition, watchPosition, clearWatch } = usePlugin(location);
  const { isAvailable } = useBridge();
  const [position, setPosition] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const handleGetCurrentPosition = async () => {
    setLoading(true);
    setError(null);
    setPosition(null);
    try {
      const pos = await getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      setPosition(pos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get location');
    } finally {
      setLoading(false);
    }
  };

  const handleWatchPosition = async () => {
    if (watchId !== null) return;
    setError(null);
    try {
      const res = await watchPosition({ enableHighAccuracy: true, interval: 10000 });
      setWatchId(res.watchId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to watch position');
    }
  };

  const handleClearWatch = async () => {
    if (watchId === null) return;
    try {
      await clearWatch(watchId);
      setWatchId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear watch');
    }
  };

  return (
    <div>
      <h1>Location Plugin</h1>

      <div className="result" style={{ background: '#f0f9ff', padding: '0.75rem', marginBottom: '1rem' }}>
        <strong>Mode:</strong> {isAvailable ? 'Native Bridge' : 'Fallback (Seoul, KR)'}
      </div>

      <div className="card">
        <h2>Location Actions</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="button" onClick={handleGetCurrentPosition} disabled={loading}>
            {loading ? 'Loading...' : 'Get Current Position'}
          </button>
          <button className="button button-secondary" onClick={handleWatchPosition} disabled={watchId !== null}>
            {watchId !== null ? 'Watching...' : 'Watch Position'}
          </button>
          <button className="button button-secondary" onClick={handleClearWatch} disabled={watchId === null}>
            Clear Watch
          </button>
        </div>
      </div>

      {error && (
        <div className="result error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {position && (
        <div className="card">
          <h2>Current Position</h2>
          <div className="result success">
            <p><strong>Location:</strong> {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}</p>
            <p><strong>Accuracy:</strong> ±{position.accuracy.toFixed(2)}m</p>
            <details style={{ marginTop: '1rem' }}>
              <summary>Full Data</summary>
              <pre>{JSON.stringify(position, null, 2)}</pre>
            </details>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Usage</h2>
        <pre>{`import { usePlugin } from './bridge';
import { location } from '@ts-bridge/plugins';

const { getCurrentPosition, watchPosition, clearWatch } = usePlugin(location);

const pos = await getCurrentPosition({ enableHighAccuracy: true });
// pos: { latitude: number; longitude: number; accuracy: number }`}</pre>
      </div>
    </div>
  );
}

export default LocationPage;

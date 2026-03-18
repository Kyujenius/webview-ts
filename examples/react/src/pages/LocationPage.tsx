import { useState, useEffect } from 'react';
import { usePlugin, useBridge } from '../bridge';
import { location } from '@example/plugins';

function LocationPage() {
  const { getCurrentPosition, watchPosition, clearWatch, on } = usePlugin(location);
  const { connectionMode } = useBridge();
  const [watchId, setWatchId] = useState<number | null>(null);
  const [livePosition, setLivePosition] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [eventCount, setEventCount] = useState(0);

  // Native → Web push event via plugin event subscription
  useEffect(() => {
    return on('updated', (pos: { latitude: number; longitude: number; accuracy: number }) => {
      setLivePosition(pos);
      setEventCount((c) => c + 1);
    });
  }, [on]);

  const handleGetCurrentPosition = () => getCurrentPosition.execute();

  const handleWatchPosition = async () => {
    if (watchId !== null) return;
    const res = await watchPosition.execute();
    if (res) setWatchId(res.watchId);
  };

  const handleClearWatch = async () => {
    if (watchId === null) return;
    await clearWatch.execute({ watchId });
    setWatchId(null);
  };

  const position = getCurrentPosition.data;
  const error = getCurrentPosition.error ?? watchPosition.error ?? clearWatch.error;

  return (
    <div>
      <h1>Location Plugin</h1>

      <div
        className="result"
        style={{ background: '#f0f9ff', padding: '0.75rem', marginBottom: '1rem' }}
      >
        <strong>Mode:</strong>{' '}
        {connectionMode === 'native'
          ? 'Native Bridge'
          : connectionMode === 'fallback'
            ? 'Fallback (Seoul, KR)'
            : 'Disconnected'}
      </div>

      <div className="card">
        <h2>Location Actions</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            className="button"
            onClick={handleGetCurrentPosition}
            disabled={getCurrentPosition.isLoading}
          >
            {getCurrentPosition.isLoading ? 'Loading...' : 'Get Current Position'}
          </button>
          <button
            className="button button-secondary"
            onClick={handleWatchPosition}
            disabled={watchId !== null}
          >
            {watchId !== null ? 'Watching...' : 'Watch Position'}
          </button>
          <button
            className="button button-secondary"
            onClick={handleClearWatch}
            disabled={watchId === null}
          >
            Clear Watch
          </button>
        </div>
      </div>

      {error && (
        <div className="result error">
          <strong>Error:</strong> {error.message}
        </div>
      )}

      {position && (
        <div className="card">
          <h2>Current Position</h2>
          <div className="result success">
            <p>
              <strong>Location:</strong> {position.latitude.toFixed(6)},{' '}
              {position.longitude.toFixed(6)}
            </p>
            <p>
              <strong>Accuracy:</strong> ±{position.accuracy.toFixed(2)}m
            </p>
            <details style={{ marginTop: '1rem' }}>
              <summary>Full Data</summary>
              <pre>{JSON.stringify(position, null, 2)}</pre>
            </details>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Live Position (useEvent)</h2>
        <p style={{ color: '#666', marginBottom: '0.5rem' }}>
          Listens for <code>location.updated</code> events pushed from Native host.
        </p>
        {livePosition ? (
          <div className="result success">
            <p>
              <strong>Live:</strong> {livePosition.latitude.toFixed(6)},{' '}
              {livePosition.longitude.toFixed(6)}
            </p>
            <p>
              <strong>Updates received:</strong> {eventCount}
            </p>
          </div>
        ) : (
          <div className="result">No events received yet.</div>
        )}
      </div>

      <div className="card">
        <h2>Usage</h2>
        <pre>{`// Request-Response + Event — all from usePlugin
const { getCurrentPosition, on } = usePlugin(location);
const pos = await getCurrentPosition();

// Event: typed subscription from plugin
useEffect(() => {
  return on('updated', (pos) => setPosition(pos));
}, [on]);`}</pre>
      </div>
    </div>
  );
}

export default LocationPage;

import { useState, useEffect } from 'react';
import { usePlugin, useBridge } from '../bridge';
import { location, type Position } from '@example/plugins';

function LocationPage() {
  const { getCurrentPosition, watchPosition, clearWatch, on } = usePlugin(location);
  const { connectionMode } = useBridge();
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [livePosition, setLivePosition] = useState<Position | null>(null);
  const [eventCount, setEventCount] = useState(0);

  // Native → Web push event via plugin event subscription
  useEffect(() => {
    return on('updated', (pos) => {
      setLivePosition(pos);
      setEventCount((c) => c + 1);
    });
  }, [on]);

  const handleGetCurrentPosition = async () => {
    setLoading(true);
    setError(null);
    setPosition(null);
    try {
      const pos = await getCurrentPosition();
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
      const res = await watchPosition();
      setWatchId(res.watchId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to watch position');
    }
  };

  const handleClearWatch = async () => {
    if (watchId === null) return;
    try {
      await clearWatch({ watchId });
      setWatchId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear watch');
    }
  };

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
          <button className="button" onClick={handleGetCurrentPosition} disabled={loading}>
            {loading ? 'Loading...' : 'Get Current Position'}
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
          <strong>Error:</strong> {error}
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

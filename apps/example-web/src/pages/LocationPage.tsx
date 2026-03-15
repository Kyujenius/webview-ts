import { useState, useMemo } from 'react';
import { location } from '@ts-bridge/plugins';
import { useBridge } from '../hooks/useBridge';

function LocationPage() {
  const { bridge, isAvailable } = useBridge();
  const api = useMemo(
    () => location.methods((action, payload) => bridge.send(action, payload)),
    [bridge],
  );
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
      const pos = await api.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      setPosition(pos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get location');
    } finally {
      setLoading(false);
    }
  };

  const handleWatchPosition = async () => {
    if (watchId !== null) {
      alert('Already watching position');
      return;
    }

    setError(null);

    try {
      const res = await api.watchPosition({
        enableHighAccuracy: true,
        interval: 10000,
      });
      setWatchId(res.watchId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to watch position');
    }
  };

  const handleClearWatch = async () => {
    if (watchId === null) {
      alert('Not watching position');
      return;
    }

    try {
      await api.clearWatch(watchId);
      setWatchId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear watch');
    }
  };

  return (
    <div>
      <h1>Location Plugin</h1>

      {!isAvailable && (
        <div className="result error">
          <strong>Native bridge not available.</strong> Location features require a React Native
          environment.
        </div>
      )}

      <div className="card">
        <h2>Location Actions</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            className="button"
            onClick={handleGetCurrentPosition}
            disabled={loading || !isAvailable}
          >
            {loading ? 'Loading...' : 'Get Current Position'}
          </button>
          <button
            className="button button-secondary"
            onClick={handleWatchPosition}
            disabled={watchId !== null || !isAvailable}
          >
            {watchId !== null ? 'Watching...' : 'Watch Position'}
          </button>
          <button
            className="button button-secondary"
            onClick={handleClearWatch}
            disabled={watchId === null || !isAvailable}
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
        <h2>API Reference</h2>
        <pre>{`import { location } from '@ts-bridge/plugins';

const api = location.methods((action, payload) => bridge.send(action, payload));

// Get current position
const pos = await api.getCurrentPosition({
  enableHighAccuracy: true,
  timeout: 10000,
});

// Watch position changes
const { watchId } = await api.watchPosition({
  enableHighAccuracy: true,
  interval: 10000,
});

// Clear position watch
await api.clearWatch(watchId);`}</pre>
      </div>
    </div>
  );
}

export default LocationPage;

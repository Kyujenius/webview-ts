import { useState } from 'react';
import { LocationPermissionType, LocationPlugin } from '@ts-bridge/plugins/location';
import { useBridge } from '../hooks/useBridge';
import type { Position } from '@ts-bridge/plugins/location';

function LocationPage() {
  const { bridge, isAvailable } = useBridge();
  const [location] = useState(() => new LocationPlugin(bridge));
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const handleGetCurrentPosition = async () => {
    setLoading(true);
    setError(null);
    setPosition(null);

    try {
      const pos = await location.getCurrentPosition({
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
      const id = await location.watchPosition({
        enableHighAccuracy: true,
        distanceFilter: 10,
        callback: (pos: Position) => {
          setPosition(pos);
        },
      });
      setWatchId(id);
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
      await location.clearWatch(watchId);
      setWatchId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear watch');
    }
  };

  const checkPermission = async () => {
    setLoading(true);
    setError(null);

    try {
      const hasPermission = await location.checkPermission(LocationPermissionType.ALWAYS);
      alert(`Location permission: ${hasPermission ? 'Granted' : 'Not granted'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check permission');
    } finally {
      setLoading(false);
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
          <button
            className="button button-secondary"
            onClick={checkPermission}
            disabled={loading || !isAvailable}
          >
            Check Permission
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
              <strong>Location:</strong> {position.coords.latitude.toFixed(6)},{' '}
              {position.coords.longitude.toFixed(6)}
            </p>
            <p>
              <strong>Accuracy:</strong> ±{position.coords.accuracy.toFixed(2)}m
            </p>
            {position.coords.altitude !== null && (
              <p>
                <strong>Altitude:</strong> {position.coords.altitude?.toFixed(2)}m
              </p>
            )}
            <p>
              <strong>Timestamp:</strong> {new Date(position.timestamp).toLocaleString()}
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
        <pre>{`const location = new LocationPlugin(bridge);

// Get current position
const position = await location.getCurrentPosition({
  enableHighAccuracy: true,
  timeout: 10000,
});

// Watch position changes
const watchId = await location.watchPosition({
  enableHighAccuracy: true,
  distanceFilter: 10,
  callback: (position) => {
    console.log('Position updated:', position);
  },
});

// Clear position watch
await location.clearWatch(watchId);

// Check location permission
const hasPermission = await location.checkPermission('location');

// Request location permission
const granted = await location.requestPermission('location');`}</pre>
      </div>
    </div>
  );
}

export default LocationPage;

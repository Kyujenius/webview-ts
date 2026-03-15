import { useState, useMemo } from 'react';
import { camera } from '@ts-bridge/plugins';
import { useBridge } from '../hooks/useBridge';

function CameraPage() {
  const { bridge, isAvailable } = useBridge();
  const api = useMemo(
    () => camera.methods((action, payload) => bridge.send(action, payload)),
    [bridge],
  );
  const [result, setResult] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTakePhoto = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const photo = await api.takePhoto({ quality: 0.8 });
      setResult(photo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to take photo');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.pickImage({ multiple: false });
      if (res.images.length > 0) {
        setResult({ uri: res.images[0].uri, width: 0, height: 0 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pick image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Camera Plugin</h1>

      {!isAvailable && (
        <div className="result error">
          <strong>Native bridge not available.</strong> Camera features require a React Native
          environment.
        </div>
      )}

      <div className="card">
        <h2>Camera Actions</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="button" onClick={handleTakePhoto} disabled={loading || !isAvailable}>
            {loading ? 'Loading...' : 'Take Photo'}
          </button>
          <button
            className="button button-secondary"
            onClick={handlePickImage}
            disabled={loading || !isAvailable}
          >
            {loading ? 'Loading...' : 'Pick Image'}
          </button>
        </div>
      </div>

      {error && (
        <div className="result error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="card">
          <h2>Result</h2>
          <div className="result success">
            <p>
              <strong>Image captured successfully!</strong>
            </p>
            <pre>{JSON.stringify(result, null, 2)}</pre>
            {result.uri && (
              <div style={{ marginTop: '1rem' }}>
                <img
                  src={result.uri}
                  alt="Captured"
                  style={{ maxWidth: '100%', borderRadius: '4px' }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <h2>API Reference</h2>
        <pre>{`import { camera } from '@ts-bridge/plugins';

const api = camera.methods((action, payload) => bridge.send(action, payload));

// Take a photo
const photo = await api.takePhoto({ quality: 0.8 });

// Pick an image from gallery
const images = await api.pickImage({ multiple: false });

// Record a video
const video = await api.recordVideo({ maxDuration: 30 });`}</pre>
      </div>
    </div>
  );
}

export default CameraPage;

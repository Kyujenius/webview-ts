import { useState } from 'react';
import { CameraPermission, CameraPlugin } from '@ts-bridge/plugins/camera';
import { useBridge } from '../hooks/useBridge';
import type { ImageResult } from '@ts-bridge/plugins/camera';

function CameraPage() {
  const { bridge, isAvailable } = useBridge();
  const [camera] = useState(() => new CameraPlugin(bridge));
  const [result, setResult] = useState<ImageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTakePhoto = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const photo = await camera.takePhoto({
        quality: 0.8,
        allowEditing: false,
      });
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
      const image = await camera.pickImage({
        allowMultiple: false,
        quality: 0.8,
      });
      setResult(Array.isArray(image) ? image[0] : image);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pick image');
    } finally {
      setLoading(false);
    }
  };

  const checkPermission = async () => {
    setLoading(true);
    setError(null);

    try {
      const hasPermission = await camera.checkPermission(CameraPermission.CAMERA);
      alert(`Camera permission: ${hasPermission ? 'Granted' : 'Not granted'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check permission');
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
        <pre>{`const camera = new CameraPlugin(bridge);

// Take a photo
const photo = await camera.takePhoto({
  quality: 0.8,
  allowEditing: false,
});

// Pick an image from gallery
const image = await camera.pickImage({
  allowMultiple: false,
  quality: 0.8,
});

// Check camera permission
const hasPermission = await camera.checkPermission('camera');

// Request camera permission
const granted = await camera.requestPermission('camera');`}</pre>
      </div>
    </div>
  );
}

export default CameraPage;

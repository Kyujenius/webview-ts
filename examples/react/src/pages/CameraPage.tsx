import { useState } from 'react';
import { camera, usePlugin, useBridge } from '../bridge';

function CameraPage() {
  const { takePhoto, pickImage } = usePlugin(camera);
  const { isAvailable } = useBridge();

  const [result, setResult] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTakePhoto = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const photo = await takePhoto({ quality: 0.8 });
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
      const res = await pickImage({ multiple: false });
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

      <div
        className="result"
        style={{ background: '#f0f9ff', padding: '0.75rem', marginBottom: '1rem' }}
      >
        <strong>Mode:</strong> {isAvailable ? 'Native Bridge' : 'Fallback (Mock Data)'}
      </div>

      <div className="card">
        <h2>Camera Actions</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="button" onClick={handleTakePhoto} disabled={loading}>
            {loading ? 'Loading...' : 'Take Photo'}
          </button>
          <button className="button button-secondary" onClick={handlePickImage} disabled={loading}>
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
        <h2>Usage</h2>
        <pre>{`import { usePlugin } from './bridge';
import { camera } from '@webview-ts/shared';

const { takePhoto, pickImage, recordVideo } = usePlugin(camera);

const photo = await takePhoto({ quality: 0.8 });
// photo: { uri: string; width: number; height: number }`}</pre>
      </div>
    </div>
  );
}

export default CameraPage;

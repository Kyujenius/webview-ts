import { usePlugin, useBridge } from '../bridge';
import { camera } from '@example/plugins';

function CameraPage() {
  const { takePhoto, pickImage } = usePlugin(camera);
  const { connectionMode } = useBridge();

  const handleTakePhoto = () => takePhoto.execute({ quality: 0.8 });

  const handlePickImage = () => pickImage.execute({ multiple: false });

  const isLoading = takePhoto.isLoading || pickImage.isLoading;
  const error = takePhoto.error ?? pickImage.error;
  const result =
    takePhoto.data ??
    (pickImage.data?.images[0] ? { uri: pickImage.data.images[0].uri, width: 0, height: 0 } : null);

  return (
    <div>
      <h1>Camera Plugin</h1>

      <div
        className="result"
        style={{ background: '#f0f9ff', padding: '0.75rem', marginBottom: '1rem' }}
      >
        <strong>Mode:</strong>{' '}
        {connectionMode === 'native'
          ? 'Native Bridge'
          : connectionMode === 'fallback'
            ? 'Fallback (Mock Data)'
            : 'Disconnected'}
      </div>

      <div className="card">
        <h2>Camera Actions</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="button" onClick={handleTakePhoto} disabled={isLoading}>
            {takePhoto.isLoading ? 'Loading...' : 'Take Photo'}
          </button>
          <button
            className="button button-secondary"
            onClick={handlePickImage}
            disabled={isLoading}
          >
            {pickImage.isLoading ? 'Loading...' : 'Pick Image'}
          </button>
        </div>
      </div>

      {error && (
        <div className="result error">
          <strong>Error:</strong> {error.message}
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
        <pre>{`import { usePlugin } from '../bridge';
import { camera } from '@example/plugins';
import type { TakePhotoResponse } from '@example/plugins';

const { takePhoto, pickImage, recordVideo } = usePlugin(camera);

const photo: TakePhotoResponse = await takePhoto({ quality: 0.8 });`}</pre>
      </div>
    </div>
  );
}

export default CameraPage;

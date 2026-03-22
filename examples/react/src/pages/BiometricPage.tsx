import { biometric } from '@example/plugins';

import { useBridge, usePlugin } from '../bridge';
import ActionError from '../components/ActionError';
import ModeBadge from '../components/ModeBadge';

function BiometricPage() {
  const { checkAvailability, authenticate } = usePlugin(biometric);
  const { connectionMode } = useBridge();

  const handleCheckAvailability = () => checkAvailability.execute();
  const handleAuthenticate = () => authenticate.execute({ reason: 'Authenticate to continue' });

  const availability = checkAvailability.data;
  const authResult = authenticate.data;
  const error = checkAvailability.error ?? authenticate.error;
  const loading = checkAvailability.isLoading || authenticate.isLoading;

  return (
    <div>
      <h1>Biometric Plugin</h1>

      <ModeBadge connectionMode={connectionMode} fallbackLabel="Mock" />

      <div className="card">
        <h2>Check Availability</h2>
        <button className="button" onClick={handleCheckAvailability} disabled={loading}>
          {checkAvailability.isLoading ? 'Checking...' : 'Check Biometric Availability'}
        </button>
        {availability && (
          <div className="result" style={{ marginTop: '1rem' }}>
            <p>
              <strong>Available:</strong> {availability.available ? 'Yes' : 'No'}
            </p>
            {availability.biometricTypes.length > 0 && (
              <p>
                <strong>Types:</strong> {availability.biometricTypes.join(', ')}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Authentication</h2>
        <button className="button" onClick={handleAuthenticate} disabled={loading}>
          {authenticate.isLoading ? 'Authenticating...' : 'Authenticate'}
        </button>
      </div>

      <ActionError error={error} />

      {authResult && (
        <div className="card">
          <h2>Authentication Result</h2>
          <div className={`result ${authResult.success ? 'success' : 'error'}`}>
            <p>
              <strong>Success:</strong> {authResult.success ? 'Yes' : 'No'}
            </p>
            {!authResult.success && (
              <p>
                <strong>Status:</strong> Authentication denied
              </p>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <h2>Usage</h2>
        <pre>{`import { usePlugin } from '../bridge';
import { biometric } from '@example/plugins';

const { checkAvailability, authenticate } = usePlugin(biometric);

const { available, biometricTypes } = await checkAvailability();
const { success } = await authenticate({ reason: 'Verify your identity' });`}</pre>
      </div>
    </div>
  );
}

export default BiometricPage;

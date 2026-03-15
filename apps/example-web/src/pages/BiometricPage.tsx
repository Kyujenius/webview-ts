import { useState } from 'react';
import { biometric } from '@ts-bridge/plugins';
import { usePlugin, useBridge } from '../bridge';

function BiometricPage() {
  const { checkAvailability, authenticate } = usePlugin(biometric);
  const { isAvailable } = useBridge();
  const [availability, setAvailability] = useState<{
    available: boolean;
    biometricTypes: string[];
  } | null>(null);
  const [authResult, setAuthResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCheckAvailability = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await checkAvailability();
      setAvailability(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check availability');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthenticate = async () => {
    setLoading(true);
    setError(null);
    setAuthResult(null);
    try {
      const result = await authenticate('Authenticate to continue');
      setAuthResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Biometric Plugin</h1>

      <div className="result" style={{ background: '#f0f9ff', padding: '0.75rem', marginBottom: '1rem' }}>
        <strong>Mode:</strong> {isAvailable ? 'Native Bridge' : 'Fallback (Mock)'}
      </div>

      <div className="card">
        <h2>Check Availability</h2>
        <button className="button" onClick={handleCheckAvailability} disabled={loading}>
          {loading ? 'Checking...' : 'Check Biometric Availability'}
        </button>
        {availability && (
          <div className="result" style={{ marginTop: '1rem' }}>
            <p><strong>Available:</strong> {availability.available ? 'Yes' : 'No'}</p>
            {availability.biometricTypes.length > 0 && (
              <p><strong>Types:</strong> {availability.biometricTypes.join(', ')}</p>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Authentication</h2>
        <button className="button" onClick={handleAuthenticate} disabled={loading}>
          {loading ? 'Authenticating...' : 'Authenticate'}
        </button>
      </div>

      {error && (
        <div className="result error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {authResult && (
        <div className="card">
          <h2>Authentication Result</h2>
          <div className={`result ${authResult.success ? 'success' : 'error'}`}>
            <p><strong>Success:</strong> {authResult.success ? 'Yes' : 'No'}</p>
            {authResult.error && <p><strong>Error:</strong> {authResult.error}</p>}
          </div>
        </div>
      )}

      <div className="card">
        <h2>Usage</h2>
        <pre>{`import { usePlugin } from './bridge';
import { biometric } from '@ts-bridge/plugins';

const { checkAvailability, authenticate } = usePlugin(biometric);

const { available, biometricTypes } = await checkAvailability();
const { success } = await authenticate('Verify your identity');`}</pre>
      </div>
    </div>
  );
}

export default BiometricPage;

import { useState, useMemo } from 'react';
import { biometric } from '@ts-bridge/plugins';
import { useBridge } from '../hooks/useBridge';

function BiometricPage() {
  const { bridge, isAvailable } = useBridge();
  const api = useMemo(
    () => biometric.methods((action, payload) => bridge.send(action, payload)),
    [bridge],
  );
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
      const result = await api.checkAvailability();
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
      const result = await api.authenticate('Authenticate to continue');
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

      {!isAvailable && (
        <div className="result error">
          <strong>Native bridge not available.</strong> Biometric features require a React Native
          environment.
        </div>
      )}

      <div className="card">
        <h2>Check Availability</h2>
        <button
          className="button"
          onClick={handleCheckAvailability}
          disabled={loading || !isAvailable}
        >
          {loading ? 'Checking...' : 'Check Biometric Availability'}
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
        <button
          className="button"
          onClick={handleAuthenticate}
          disabled={loading || !isAvailable}
        >
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
            <p>
              <strong>Success:</strong> {authResult.success ? 'Yes' : 'No'}
            </p>
            {authResult.error && (
              <p>
                <strong>Error:</strong> {authResult.error}
              </p>
            )}
            <details style={{ marginTop: '1rem' }}>
              <summary>Full Data</summary>
              <pre>{JSON.stringify(authResult, null, 2)}</pre>
            </details>
          </div>
        </div>
      )}

      <div className="card">
        <h2>API Reference</h2>
        <pre>{`import { biometric } from '@ts-bridge/plugins';

const api = biometric.methods((action, payload) => bridge.send(action, payload));

// Check if biometric authentication is available
const availability = await api.checkAvailability();
console.log('Available:', availability.available);
console.log('Types:', availability.biometricTypes);

// Authenticate
const result = await api.authenticate('Please verify your identity');`}</pre>
      </div>
    </div>
  );
}

export default BiometricPage;

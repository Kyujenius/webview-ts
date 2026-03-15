import { useState } from 'react';
import { BiometricPlugin } from '@ts-bridge/plugins/biometric';
import { useBridge } from '../hooks/useBridge';
import type {
  BiometricAvailability,
  BiometricType,
  AuthenticationResult,
} from '@ts-bridge/plugins/biometric';

function BiometricPage() {
  const { bridge, isAvailable } = useBridge();
  const [biometric] = useState(() => new BiometricPlugin(bridge));
  const [availability, setAvailability] = useState<BiometricAvailability | null>(null);
  const [types, setTypes] = useState<BiometricType[]>([]);
  const [authResult, setAuthResult] = useState<AuthenticationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCheckAvailability = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await biometric.checkAvailability();
      setAvailability(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check availability');
    } finally {
      setLoading(false);
    }
  };

  const handleGetAvailableTypes = async () => {
    setLoading(true);
    setError(null);

    try {
      const availableTypes = await biometric.getAvailableTypes();
      setTypes(availableTypes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get available types');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthenticate = async () => {
    setLoading(true);
    setError(null);
    setAuthResult(null);

    try {
      const result = await biometric.authenticate({
        promptMessage: 'Authenticate to continue',
        cancelButtonText: 'Cancel',
        fallbackButtonText: 'Use PIN',
      });
      setAuthResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSimpleAuthenticate = async () => {
    setLoading(true);
    setError(null);

    try {
      const success = await biometric.simpleAuthenticate();
      alert(success ? 'Authentication successful!' : 'Authentication failed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthenticateWithMessage = async () => {
    setLoading(true);
    setError(null);
    setAuthResult(null);

    try {
      const result = await biometric.authenticateWithMessage('Please verify your identity');
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
            {availability.error && (
              <p>
                <strong>Error:</strong> {availability.error}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Get Available Types</h2>
        <button
          className="button"
          onClick={handleGetAvailableTypes}
          disabled={loading || !isAvailable}
        >
          {loading ? 'Loading...' : 'Get Available Biometric Types'}
        </button>
        {types.length > 0 && (
          <div className="result success" style={{ marginTop: '1rem' }}>
            <p>
              <strong>Available Types:</strong>
            </p>
            <ul style={{ marginLeft: '1.5rem' }}>
              {types.map((type) => (
                <li key={type}>{type}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Authentication</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            className="button"
            onClick={handleAuthenticate}
            disabled={loading || !isAvailable}
          >
            {loading ? 'Authenticating...' : 'Authenticate'}
          </button>
          <button
            className="button button-secondary"
            onClick={handleSimpleAuthenticate}
            disabled={loading || !isAvailable}
          >
            Simple Authenticate
          </button>
          <button
            className="button button-secondary"
            onClick={handleAuthenticateWithMessage}
            disabled={loading || !isAvailable}
          >
            Authenticate with Message
          </button>
        </div>
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
            {authResult.errorCode && (
              <p>
                <strong>Error Code:</strong> {authResult.errorCode}
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
        <pre>{`const biometric = new BiometricPlugin(bridge);

// Check if biometric authentication is available
const availability = await biometric.checkAvailability();
console.log('Available:', availability.available);
console.log('Types:', availability.biometricTypes);

// Get available biometric types
const types = await biometric.getAvailableTypes();
// ['FACE_ID', 'TOUCH_ID'] or ['FINGERPRINT', 'FACE']

// Authenticate with options
const result = await biometric.authenticate({
  promptMessage: 'Authenticate to continue',
  cancelLabel: 'Cancel',
  fallbackLabel: 'Use PIN',
});

// Simple authentication (returns boolean)
const success = await biometric.simpleAuthenticate();

// Authenticate with custom message
const result = await biometric.authenticateWithMessage(
  'Please verify your identity'
);`}</pre>
      </div>
    </div>
  );
}

export default BiometricPage;

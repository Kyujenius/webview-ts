import { useBridge } from '../bridge';

function HomePage() {
  const { isAvailable } = useBridge();

  return (
    <div>
      <h1>TS Bridge Example App</h1>

      <div className="card">
        <h2>Bridge Status</h2>
        <p>
          Status:{' '}
          <span className={isAvailable ? 'status-connected' : 'status-disconnected'}>
            {isAvailable ? 'Connected to Native' : 'Web Only Mode'}
          </span>
        </p>
        <p style={{ marginTop: '1rem' }}>
          This example app demonstrates the usage of all ts-bridge packages:
        </p>
        <ul style={{ marginLeft: '2rem', marginTop: '0.5rem' }}>
          <li>
            <strong>@ts-bridge/core</strong> - Bridge manager and communication
          </li>
          <li>
            <strong>@ts-bridge/shared</strong> - Types, contracts, and plugin definitions
          </li>
          <li>
            <strong>@ts-bridge/devtools</strong> - Communication visualization
          </li>
        </ul>
      </div>

      <div className="card">
        <h2>Features</h2>
        <div className="grid">
          <div>
            <h3>Camera Plugin</h3>
            <p>Take photos, pick images, and record videos</p>
          </div>
          <div>
            <h3>Location Plugin</h3>
            <p>Get current position and watch location changes</p>
          </div>
          <div>
            <h3>Storage Plugin</h3>
            <p>Persistent key-value storage with JSON support</p>
          </div>
          <div>
            <h3>Biometric Plugin</h3>
            <p>Fingerprint and Face ID authentication</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Getting Started</h2>
        <p>
          Use the navigation menu above to explore different plugin examples. Each page demonstrates
          the plugin's API and shows live results.
        </p>
        {!isAvailable && (
          <div className="result error" style={{ marginTop: '1rem' }}>
            <strong>Note:</strong> You are currently in web-only mode. To test native features, run
            this app inside a React Native WebView with the <code>@ts-bridge/native</code> package
            configured.
          </div>
        )}
      </div>
    </div>
  );
}

export default HomePage;

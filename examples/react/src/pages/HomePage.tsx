import { useBridge } from '../bridge';

function HomePage() {
  const { connectionMode } = useBridge();

  return (
    <div>
      <h1>TS Bridge Example App</h1>

      <div className="card">
        <h2>Bridge Status</h2>
        <p>
          Status:{' '}
          <span
            className={
              connectionMode === 'native'
                ? 'status-connected'
                : connectionMode === 'fallback'
                  ? 'status-fallback'
                  : 'status-disconnected'
            }
          >
            {connectionMode === 'native'
              ? 'Connected to Native'
              : connectionMode === 'fallback'
                ? 'Fallback Mode'
                : 'Disconnected'}
          </span>
        </p>
        <p style={{ marginTop: '1rem' }}>
          This example app demonstrates the usage of all ts-bridge packages:
        </p>
        <ul style={{ marginLeft: '2rem', marginTop: '0.5rem' }}>
          <li>
            <strong>@webview-ts/core</strong> - Bridge manager and communication
          </li>
          <li>
            <strong>@webview-ts/shared</strong> - Types, contracts, and plugin definitions
          </li>
          <li>
            <strong>@webview-ts/devtools</strong> - Communication visualization
          </li>
        </ul>
      </div>

      <div className="card">
        <h2>Features</h2>
        <div className="grid">
          <div>
            <h3>Camera</h3>
            <p>Take photos, pick images, and record videos</p>
          </div>
          <div>
            <h3>Location</h3>
            <p>Get current position and watch location changes</p>
          </div>
          <div>
            <h3>Biometric</h3>
            <p>Fingerprint and Face ID authentication</p>
          </div>
          <div>
            <h3>Phone</h3>
            <p>Make phone calls via native dialer</p>
          </div>
          <div>
            <h3>Calendar</h3>
            <p>Add and read native calendar events</p>
          </div>
          <div>
            <h3>Haptics</h3>
            <p>Tactile feedback for touch interactions</p>
          </div>
          <div>
            <h3>Device</h3>
            <p>Device name, model, OS information</p>
          </div>
          <div>
            <h3>Share</h3>
            <p>Native share sheet for content sharing</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Getting Started</h2>
        <p>
          Use the navigation menu above to explore different plugin examples. Each page demonstrates
          the plugin's API and shows live results.
        </p>
        {connectionMode !== 'native' && (
          <div className="result error" style={{ marginTop: '1rem' }}>
            <strong>Note:</strong> You are currently in{' '}
            {connectionMode === 'fallback' ? 'fallback' : 'disconnected'} mode. To test native
            features, run this app inside a React Native WebView with the{' '}
            <code>@webview-ts/native</code> package configured.
          </div>
        )}
      </div>
    </div>
  );
}

export default HomePage;

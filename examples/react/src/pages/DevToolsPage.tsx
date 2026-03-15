import { useState, useEffect } from 'react';
import { useBridge } from '../bridge';
import type { Middleware, MiddlewareContext } from '@webview-ts/core';

interface LogEntry {
  timestamp: number;
  type: 'request' | 'response' | 'error';
  action: string;
  data?: unknown;
  duration?: number;
}

function DevToolsPage() {
  const { bridge } = useBridge();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    if (isEnabled) {
      // Add devtools middleware to bridge
      const middleware: Middleware = {
        name: 'DevToolsLogger',
        onRequest: async (context: MiddlewareContext) => {
          setLogs((prev) => [
            ...prev,
            {
              timestamp: Date.now(),
              type: 'request',
              action: context.request.action,
              data: context.request.payload,
            },
          ]);
        },
        onResponse: async (context: MiddlewareContext) => {
          setLogs((prev) => [
            ...prev,
            {
              timestamp: Date.now(),
              type: 'response',
              action: context.request.action,
              data: context.response?.data,
              duration: Date.now() - context.startTime,
            },
          ]);
        },
        onError: async (context: MiddlewareContext, error: Error) => {
          setLogs((prev) => [
            ...prev,
            {
              timestamp: Date.now(),
              type: 'error',
              action: context.request.action,
              data: error.message,
              duration: Date.now() - context.startTime,
            },
          ]);
        },
      };

      bridge.use(middleware);
    }
  }, [isEnabled, bridge]);

  const handleToggleDevTools = () => {
    setIsEnabled(!isEnabled);
    if (isEnabled) {
      setLogs([]);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString() + '.' + date.getMilliseconds();
  };

  return (
    <div>
      <h1>DevTools</h1>

      <div className="card">
        <h2>DevTools Controls</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="button" onClick={handleToggleDevTools}>
            {isEnabled ? 'Disable DevTools' : 'Enable DevTools'}
          </button>
          <button
            className="button button-secondary"
            onClick={handleClearLogs}
            disabled={logs.length === 0}
          >
            Clear Logs
          </button>
          <span className={isEnabled ? 'status-connected' : 'status-disconnected'}>
            {isEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {isEnabled && (
        <>
          <div className="card">
            <h2>Communication Log ({logs.length} entries)</h2>
            {logs.length === 0 ? (
              <p>No communication logs yet. Try using one of the plugin pages.</p>
            ) : (
              <div
                style={{
                  maxHeight: '600px',
                  overflowY: 'auto',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              >
                {logs.map((log, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '0.75rem',
                      borderBottom: '1px solid #eee',
                      background:
                        log.type === 'error'
                          ? '#fff5f5'
                          : log.type === 'response'
                            ? '#f0f9ff'
                            : '#fff',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <strong>
                        <span
                          style={{
                            color:
                              log.type === 'error'
                                ? '#dc3545'
                                : log.type === 'response'
                                  ? '#28a745'
                                  : '#007bff',
                          }}
                        >
                          {log.type.toUpperCase()}
                        </span>{' '}
                        {log.action}
                      </strong>
                      <span style={{ color: '#666', fontSize: '0.875rem' }}>
                        {formatTime(log.timestamp)}
                        {log.duration && ` (${log.duration}ms)`}
                      </span>
                    </div>
                    {log.data !== undefined && (
                      <details>
                        <summary style={{ cursor: 'pointer', color: '#666' }}>View data</summary>
                        <pre
                          style={{
                            marginTop: '0.5rem',
                            padding: '0.5rem',
                            background: '#f8f9fa',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            overflow: 'auto',
                          }}
                        >
                          {typeof log.data === 'string'
                            ? log.data
                            : JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2>Statistics</h2>
            <div className="grid">
              <div>
                <h3>Total Requests</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff' }}>
                  {logs.filter((l) => l.type === 'request').length}
                </p>
              </div>
              <div>
                <h3>Successful Responses</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>
                  {logs.filter((l) => l.type === 'response').length}
                </p>
              </div>
              <div>
                <h3>Errors</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc3545' }}>
                  {logs.filter((l) => l.type === 'error').length}
                </p>
              </div>
              <div>
                <h3>Avg Response Time</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6c757d' }}>
                  {logs.filter((l) => l.duration).length > 0
                    ? Math.round(
                        logs
                          .filter((l) => l.duration)
                          .reduce((sum, l) => sum + (l.duration || 0), 0) /
                          logs.filter((l) => l.duration).length
                      )
                    : 0}
                  ms
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="card">
        <h2>About DevTools</h2>
        <p>
          The DevTools middleware intercepts all bridge communication to provide visibility into
          requests, responses, and errors. Enable it to monitor bridge activity in real-time.
        </p>
        <h3 style={{ marginTop: '1rem' }}>Features:</h3>
        <ul style={{ marginLeft: '2rem', marginTop: '0.5rem' }}>
          <li>Request/response logging</li>
          <li>Error tracking</li>
          <li>Performance monitoring</li>
          <li>Communication timeline</li>
          <li>Detailed message inspection</li>
        </ul>
      </div>

      <div className="card">
        <h2>API Reference</h2>
        <pre>{`import { DevToolsMiddleware } from '@webview-ts/devtools';

const bridge = new BridgeManager();
const devTools = new DevToolsMiddleware();

// Add devtools middleware
bridge.use(async (message, next) => {
  console.log('Request:', message);
  const response = await next(message);
  console.log('Response:', response);
  return response;
});

// Or use the built-in logger middleware
import { LoggerMiddleware } from '@webview-ts/devtools';
bridge.use(new LoggerMiddleware());`}</pre>
      </div>
    </div>
  );
}

export default DevToolsPage;

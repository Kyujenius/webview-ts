import { device } from '@example/plugins';
import type { RequestInterceptor } from '@webview-ts/shared';
import { useEffect, useState } from 'react';

import { useBridge, usePlugin } from '../bridge';

/**
 * Interceptor Examples Page
 *
 * Demonstrates request and response interceptor patterns:
 * 1. Auth token injection — adds token to every request payload
 * 2. Inline logger — logs every outgoing request action
 */

// ─── Request Interceptor: Auth Token Injection ───

function createAuthInterceptor(getToken: () => string | null): RequestInterceptor {
  return {
    name: 'auth-token',
    fn: (request) => {
      const token = getToken();
      if (token) {
        return {
          ...request,
          payload: {
            ...(request.payload as Record<string, unknown>),
            __authToken: token,
          },
        };
      }
      return request;
    },
  };
}

// ─── Page Component ───

export default function MiddlewarePage() {
  const { bridge } = useBridge();
  const { getInfo } = usePlugin(device);
  const [logs, setLogs] = useState<string[]>([]);
  const [interceptorsRegistered, setInterceptorsRegistered] = useState(false);

  const addLog = (msg: string) => setLogs((prev) => [...prev.slice(-19), msg]);

  // Register interceptors on mount
  useEffect(() => {
    if (interceptorsRegistered) return;

    const unsubLogger = bridge.interceptors.request.use({
      name: 'logger',
      fn: (request) => {
        console.log(`[→] ${request.action}`, request.payload);
        return request;
      },
    });

    const unsubAuth = bridge.interceptors.request.use(
      createAuthInterceptor(() => 'demo-token-12345')
    );

    setInterceptorsRegistered(true);
    addLog('✓ Interceptors registered (logger, auth-token)');

    return () => {
      unsubLogger();
      unsubAuth();
    };
  }, [bridge, interceptorsRegistered]);

  const handleFetchDevice = async () => {
    addLog('→ Calling device.getInfo...');
    try {
      const result = await getInfo.execute();
      addLog(`← Success: ${JSON.stringify(result).slice(0, 80)}...`);
    } catch (err) {
      addLog(`← Error: ${(err as Error).message}`);
    }
  };

  return (
    <div>
      <h1>Interceptor Examples</h1>
      <p className="description">
        Demonstrates request interceptor patterns. Open browser console to see Logger output.
      </p>

      <div className="card">
        <h2>Interceptors</h2>
        <p>
          <strong>Logger:</strong> Logs every outgoing request action to console
          <br />
          <strong>Auth:</strong> Injects token into every request payload
        </p>
      </div>

      <div className="card">
        <h2>Try It</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="button" onClick={handleFetchDevice}>
            Fetch Device Info
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Log</h2>
        <pre style={{ fontSize: 12, maxHeight: 300, overflow: 'auto' }}>
          {logs.length === 0 ? 'No logs yet. Click a button above.' : logs.join('\n')}
        </pre>
      </div>

      <div className="card">
        <h2>Code</h2>
        <pre style={{ fontSize: 11 }}>
          {`// 1. Inline logger (request interceptor)
const unsub = bridge.interceptors.request.use({
  name: 'logger',
  fn: (request) => {
    console.log('[→]', request.action);
    return request; // always return the (possibly modified) request
  },
});

// Unsubscribe when done
unsub();

// 2. Auth token injection
bridge.interceptors.request.use({
  name: 'auth-token',
  fn: (request) => ({
    ...request,
    payload: { ...request.payload, __authToken: getToken() },
  }),
});

// 3. Response interceptor
bridge.interceptors.response.use({
  name: 'error-reporter',
  fn: (response) => {
    if (!response.success) {
      reportError(response.error);
    }
    return response;
  },
});`}
        </pre>
      </div>
      <div className="card">
        <h2>Global vs Plugin Interceptor</h2>
        <pre style={{ fontSize: 11 }}>
          {`// ─── Global Interceptor ───
// Runs on EVERY action. Use for cross-cutting concerns.
// Registered via bridge.interceptors.request.use()
// or createBridgeReact({ interceptors: { request: [...] } })

bridge.interceptors.request.use(logger);   // Log all calls
bridge.interceptors.request.use(auth);     // Inject token on all requests

// ─── Plugin Interceptor ───
// Runs on ONE specific action only. Use for per-action behavior.
// Registered via action.use() in plugin definition.

const camera = definePlugin('camera', {
  takePhoto: action<Payload, Response>({ timeout: 30000 })
    .use(compressionInterceptor)   // Only for takePhoto
    .use(watermarkInterceptor),    // Only for takePhoto
  getInfo: action<void, Info>(),   // No interceptors
});`}
        </pre>
      </div>
    </div>
  );
}

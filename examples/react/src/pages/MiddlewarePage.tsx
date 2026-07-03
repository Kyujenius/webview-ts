import { calendar, device } from '@example/plugins';
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
  const { addEvent } = usePlugin(calendar);
  const [logs, setLogs] = useState<string[]>([]);
  const [interceptorsRegistered, setInterceptorsRegistered] = useState(false);
  const [lastEventId, setLastEventId] = useState<string | null>(null);

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

  const handleAddEvent = async () => {
    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    addLog('→ Calling calendar.addEvent (stamp-source interceptor active)...');
    try {
      const result = await addEvent.execute({
        title: 'Middleware Demo Event',
        startDate: now.toISOString(),
        endDate: end.toISOString(),
      });
      if (result) {
        setLastEventId(result.id);
        addLog(
          `← Success: id=${result.id} (payload stamped with source="webview-ts-example" by per-action interceptor)`
        );
      }
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
            Fetch Device Info (global interceptors)
          </button>
          <button className="button button-secondary" onClick={handleAddEvent}>
            Add Calendar Event (per-action stamp-source)
          </button>
        </div>
        {lastEventId && (
          <div className="result success" style={{ marginTop: 8 }}>
            Event created — id: <code>{lastEventId}</code>. The <code>stamp-source</code> per-action
            interceptor injected <code>source: "webview-ts-example"</code> into the payload before
            dispatch.
          </div>
        )}
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
        <h2>Global vs Per-Action Interceptor</h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: '0.75rem' }}>
          The <strong>Add Calendar Event</strong> button above triggers{' '}
          <code>calendar.addEvent</code>, which has a per-action <code>stamp-source</code>{' '}
          interceptor defined in the plugin itself — it appends{' '}
          <code>source: "webview-ts-example"</code> to every <code>addEvent</code> payload
          automatically.
        </p>
        <pre style={{ fontSize: 11 }}>
          {`// ─── Global Interceptor ───
// Runs on EVERY action. Registered at bridge level.
bridge.interceptors.request.use(logger);   // Log all calls
bridge.interceptors.request.use(auth);     // Inject token on all requests

// ─── Per-Action Interceptor (real — calendar plugin) ───
// Defined on the action inside definePlugin. Runs only for addEvent.
const calendar = definePlugin('calendar', {
  addEvent: action<AddEventPayload, AddEventResponse>()
    .interceptors.request.use({
      name: 'stamp-source',
      fn: (req) => ({
        ...req,
        payload: { ...req.payload, source: 'webview-ts-example' },
      }),
    }),
  getEvents: action<GetEventsPayload, GetEventsResponse>(), // no interceptor
});`}
        </pre>
      </div>
    </div>
  );
}

import { validationDemo } from '@example/plugins';
import { BridgeCallError } from '@webview-ts/shared';
import { useState } from 'react';

import { usePlugin } from '../bridge';

interface ValidationIssue {
  message: string;
  path?: (string | number)[];
}

interface ValidationDetails {
  side: string;
  issues: ValidationIssue[];
}

type ResultState =
  | { kind: 'idle' }
  | { kind: 'success'; data: { name: string; age: number; joinedAt: number } }
  | { kind: 'validation-error'; code: string; side: string; issues: ValidationIssue[] }
  | { kind: 'error'; message: string };

export default function ValidationPage() {
  const { getProfile, getBrokenProfile } = usePlugin(validationDemo);
  const [result, setResult] = useState<ResultState>({ kind: 'idle' });

  const handleValidCall = async () => {
    setResult({ kind: 'idle' });
    try {
      const data = await getProfile.execute();
      if (data) setResult({ kind: 'success', data });
    } catch (err) {
      if (err instanceof BridgeCallError && err.code === 'VALIDATION_ERROR') {
        const details = err.details as ValidationDetails | undefined;
        setResult({
          kind: 'validation-error',
          code: err.code,
          side: details?.side ?? 'unknown',
          issues: details?.issues ?? [],
        });
      } else {
        setResult({ kind: 'error', message: (err as Error).message });
      }
    }
  };

  const handleBrokenHost = async () => {
    setResult({ kind: 'idle' });
    try {
      const data = await getBrokenProfile.execute();
      if (data) setResult({ kind: 'success', data });
    } catch (err) {
      if (err instanceof BridgeCallError && err.code === 'VALIDATION_ERROR') {
        const details = err.details as ValidationDetails | undefined;
        setResult({
          kind: 'validation-error',
          code: err.code,
          side: details?.side ?? 'unknown',
          issues: details?.issues ?? [],
        });
      } else {
        setResult({ kind: 'error', message: (err as Error).message });
      }
    }
  };

  return (
    <div>
      <h1>Response Validation</h1>
      <p className="description">
        <strong>Payload validation</strong> (host-inbound) requires a native app — the bridge
        validates request payloads before the native handler runs. This demo focuses on{' '}
        <strong>response validation</strong> (<code>client-response</code>): the client checks the
        response schema after receiving it. This catches contract-violating responses from outdated
        native builds — without any native app required.
      </p>

      <div className="card">
        <h2>Try It</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="button" onClick={handleValidCall} disabled={getProfile.isLoading}>
            {getProfile.isLoading ? 'Loading…' : 'Valid call (getProfile)'}
          </button>
          <button
            className="button button-secondary"
            onClick={handleBrokenHost}
            disabled={getBrokenProfile.isLoading}
          >
            {getBrokenProfile.isLoading ? 'Loading…' : 'Broken host (getBrokenProfile)'}
          </button>
        </div>
      </div>

      {result.kind === 'success' && (
        <div className="card">
          <h2>Result</h2>
          <div className="result success">
            <p>
              <strong>name:</strong> {result.data.name}
            </p>
            <p>
              <strong>age:</strong> {result.data.age}
            </p>
            <p>
              <strong>joinedAt:</strong> {result.data.joinedAt}{' '}
              <span style={{ color: '#6b7280', fontSize: 12 }}>
                (Unix ms — {new Date(result.data.joinedAt).toISOString()})
              </span>
            </p>
          </div>
        </div>
      )}

      {result.kind === 'validation-error' && (
        <div className="card">
          <h2>Validation Error</h2>
          <div className="result error">
            <p>
              <strong>code:</strong> <code>{result.code}</code>
            </p>
            <p>
              <strong>side:</strong> <code>{result.side}</code>
            </p>
            <p style={{ marginTop: '0.75rem' }}>
              <strong>issues:</strong>
            </p>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.25rem' }}>
              {result.issues.map((issue, i) => (
                <li key={i} style={{ marginBottom: '0.25rem' }}>
                  {issue.path && issue.path.length > 0 && (
                    <code style={{ marginRight: 6 }}>{issue.path.join('.')}</code>
                  )}
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {result.kind === 'error' && (
        <div className="card">
          <div className="result error">{result.message}</div>
        </div>
      )}

      <div className="card">
        <h2>How It Works</h2>
        <pre style={{ fontSize: 11 }}>
          {`// Plugin definition
const profileResponse = z.object({
  name: z.string(),
  age:  z.number().int().min(0),
  joinedAt: z.number().int().min(0),
});

const validationDemo = definePlugin('validationDemo', {
  getProfile:      action({ response: profileResponse }),
  getBrokenProfile: action({ response: profileResponse }),
}).withFallback({
  getProfile:       async () => ({ name: 'Ada', age: 36, joinedAt: 1719970000000 }),
  // deliberate contract violation — age is a string, joinedAt missing
  getBrokenProfile: async () => ({ name: 'Bad Host', age: 'thirty' }),
});

// Consuming
try {
  const profile = await getProfile.execute();
} catch (err) {
  if (err instanceof BridgeCallError && err.code === 'VALIDATION_ERROR') {
    const { side, issues } = err.details;
    // side: 'client-response'
    // issues: [{ path: ['age'], message: '...' }, ...]
  }
}`}
        </pre>
      </div>
    </div>
  );
}

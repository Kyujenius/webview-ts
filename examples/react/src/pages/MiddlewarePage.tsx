import { useEffect, useState } from 'react';
import { useBridge, usePlugin } from '../bridge';
import { createLogger, createValidator } from '@webview-ts/core';
import { device } from '@example/plugins';
import type { Middleware, MiddlewareFn } from '@webview-ts/shared';

/**
 * Middleware Examples Page
 *
 * Demonstrates three middleware patterns:
 * 1. Built-in Logger — logs every request/response to console
 * 2. Built-in Validator — validates message format
 * 3. Custom middleware — cache, auth token injection, timing
 */

// ─── Custom Middleware: Simple Cache ───

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 10_000; // 10 seconds

const cacheMiddleware: Middleware = {
  name: 'simple-cache',
  fn: async (ctx, next) => {
    const key = ctx.request.action;
    const cached = cache.get(key);

    // Cache hit — short-circuit (don't call native)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      ctx.response = {
        id: ctx.request.id,
        sourceId: 'cache',
        targetId: ctx.request.sourceId,
        success: true,
        data: cached.data,
        timestamp: Date.now(),
      };
      return; // Don't call next() — skips all inner middleware + handler
    }

    // Cache miss — proceed normally
    await next();

    // After response — store in cache
    if (ctx.response?.success) {
      cache.set(key, { data: ctx.response.data, timestamp: Date.now() });
    }
  },
};

// ─── Custom Middleware: Auth Token Injection ───

function createAuthMiddleware(getToken: () => string | null): Middleware {
  const fn: MiddlewareFn = async (ctx, next) => {
    const token = getToken();
    if (token) {
      // Attach token to metadata — handlers/other middleware can read it
      ctx.metadata.set('authToken', token);

      // Or modify payload directly (if your protocol supports it)
      ctx.request.payload = {
        ...(ctx.request.payload as Record<string, unknown>),
        __authToken: token,
      };
    }
    await next();
  };
  return { name: 'auth-token', fn };
}

// ─── Custom Middleware: Timing ───

const timingMiddleware: Middleware = {
  name: 'timing',
  fn: async (ctx, next) => {
    const start = performance.now();
    await next();
    const elapsed = performance.now() - start;

    // Store timing in metadata for other middleware to read
    ctx.metadata.set('totalMs', Math.round(elapsed * 100) / 100);
  },
};

// ─── Page Component ───

export default function MiddlewarePage() {
  const { bridge } = useBridge();
  const { getInfo } = usePlugin(device);
  const [logs, setLogs] = useState<string[]>([]);
  const [middlewareRegistered, setMiddlewareRegistered] = useState(false);

  const addLog = (msg: string) => setLogs((prev) => [...prev.slice(-19), msg]);

  // Register middleware on mount
  useEffect(() => {
    if (middlewareRegistered) return;

    // Order matters: outermost runs first
    // timing (outer) → logger → validator → cache (inner) → [core]
    bridge.use(timingMiddleware);
    bridge.use(createLogger({ includePayload: true, includeResponse: true }));
    bridge.use(createValidator({ onValidationError: 'warn' }));
    bridge.use(cacheMiddleware);
    bridge.use(createAuthMiddleware(() => 'demo-token-12345'));

    setMiddlewareRegistered(true);
    addLog('✓ Middleware registered (timing → logger → validator → cache → auth)');

    return () => {
      bridge.removeMiddleware('timing');
      bridge.removeMiddleware('logger');
      bridge.removeMiddleware('validator');
      bridge.removeMiddleware('simple-cache');
      bridge.removeMiddleware('auth-token');
    };
  }, [bridge, middlewareRegistered]);

  const handleFetchDevice = async () => {
    addLog('→ Calling device.getInfo...');
    try {
      const result = await getInfo.execute();
      addLog(`← Success: ${JSON.stringify(result).slice(0, 80)}...`);
    } catch (err) {
      addLog(`← Error: ${(err as Error).message}`);
    }
  };

  const handleFetchCached = async () => {
    addLog('→ Calling device.getInfo (should be cached)...');
    try {
      const result = await getInfo.execute();
      addLog(`← Cached: ${JSON.stringify(result).slice(0, 80)}...`);
    } catch (err) {
      addLog(`← Error: ${(err as Error).message}`);
    }
  };

  const handleClearCache = () => {
    cache.clear();
    addLog('✓ Cache cleared');
  };

  return (
    <div>
      <h1>Middleware Examples</h1>
      <p className="description">
        Demonstrates built-in and custom middleware. Open browser console to see Logger output.
      </p>

      <div className="card">
        <h2>Built-in Middleware</h2>
        <p>
          <code>createLogger()</code> — logs every request/response with timing
          <br />
          <code>createValidator()</code> — validates message format before send
        </p>
      </div>

      <div className="card">
        <h2>Custom Middleware</h2>
        <p>
          <strong>Cache:</strong> Short-circuits on cache hit (skips native call)
          <br />
          <strong>Auth:</strong> Injects token into every request payload
          <br />
          <strong>Timing:</strong> Measures total roundtrip time
        </p>
      </div>

      <div className="card">
        <h2>Try It</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="button" onClick={handleFetchDevice}>
            Fetch Device Info
          </button>
          <button className="button" onClick={handleFetchCached}>
            Fetch (Cached)
          </button>
          <button className="button secondary" onClick={handleClearCache}>
            Clear Cache
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
          {`// 1. Built-in: Logger + Validator
bridge.use(createLogger({ includePayload: true }));
bridge.use(createValidator({ onValidationError: 'warn' }));

// 2. Custom: Cache (short-circuit pattern)
const cacheMiddleware: Middleware = {
  name: 'simple-cache',
  fn: async (ctx, next) => {
    const cached = cache.get(ctx.request.action);
    if (cached) {
      ctx.response = { ...cached };
      return; // Don't call next() → skip native
    }
    await next();
    if (ctx.response?.success) {
      cache.set(ctx.request.action, ctx.response);
    }
  },
};

// 3. Custom: Auth token injection
bridge.use({
  name: 'auth-token',
  fn: async (ctx, next) => {
    ctx.metadata.set('authToken', getToken());
    await next();
  },
});`}
        </pre>
      </div>
    </div>
  );
}

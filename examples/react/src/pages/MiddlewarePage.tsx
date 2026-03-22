import { device } from '@example/plugins';
import type { Middleware, MiddlewareFn } from '@webview-ts/shared';
import { useEffect, useState } from 'react';

import { useBridge, usePlugin } from '../bridge';

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
    bridge.use({
      name: 'logger',
      fn: async (ctx, next) => {
        console.log(`[→] ${ctx.request.action}`, ctx.request.payload);
        await next();
        if (ctx.response?.success) {
          console.log(
            `[←] ${ctx.request.action} (${Date.now() - ctx.startTime}ms)`,
            ctx.response.data
          );
        } else if (ctx.response) {
          console.error(`[✗] ${ctx.request.action}`, ctx.response.error);
        }
      },
    });
    bridge.use(cacheMiddleware);
    bridge.use(createAuthMiddleware(() => 'demo-token-12345'));

    setMiddlewareRegistered(true);
    addLog('✓ Middleware registered (timing → logger → cache → auth)');

    return () => {
      bridge.removeMiddleware('timing');
      bridge.removeMiddleware('logger');
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
        <h2>Middleware</h2>
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
          {`// 1. Logger (inline middleware)
bridge.use({
  name: 'logger',
  fn: async (ctx, next) => {
    console.log('[→]', ctx.request.action);
    await next();
    console.log('[←]', ctx.request.action);
  },
});

// 2. Cache (short-circuit pattern)
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
      <div className="card">
        <h2>Global vs Plugin Interceptor</h2>
        <pre style={{ fontSize: 11 }}>
          {`// ─── Global Middleware ───
// Runs on EVERY action. Use for cross-cutting concerns.
// Registered via bridge.use() or createBridgeReact({ middleware: [...] })

bridge.use(logger());      // Log all calls
bridge.use(auth());        // Inject token on all requests
bridge.use(timing());      // Measure all roundtrips

// ─── Plugin Interceptor ───
// Runs on ONE specific action only. Use for per-action behavior.
// Registered via action.use() in plugin definition.

const camera = definePlugin('camera', {
  takePhoto: action<Payload, Response>({ timeout: 30000 })
    .use(compressionInterceptor)   // Only for takePhoto
    .use(watermarkInterceptor),    // Only for takePhoto
  getInfo: action<void, Info>(),   // No interceptors
});

// ─── Execution Order ───
//
//  Global MW[0] (request)     ← outermost
//    Global MW[1] (request)
//      Plugin Interceptor[0] (request)  ← action-specific
//        [CORE: send to native]
//      Plugin Interceptor[0] (response)
//    Global MW[1] (response)
//  Global MW[0] (response)    ← outermost
//
// Rule of thumb:
//   Affects ALL actions → global
//   Affects ONE action  → interceptor`}
        </pre>
      </div>
    </div>
  );
}

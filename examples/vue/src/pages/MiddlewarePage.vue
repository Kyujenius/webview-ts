<script setup lang="ts">
import { device } from '@example/plugins';
import type { Middleware, MiddlewareFn } from '@webview-ts/shared';
import { ref } from 'vue';

import { useBridge, usePlugin } from '../bridge';

// ─── Custom Middleware: Simple Cache ───

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 10_000;

const cacheMiddleware: Middleware = {
  name: 'simple-cache',
  fn: async (ctx, next) => {
    const key = ctx.request.action;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      ctx.response = {
        id: ctx.request.id,
        sourceId: 'cache',
        targetId: ctx.request.sourceId,
        success: true,
        data: cached.data,
        timestamp: Date.now(),
      };
      return;
    }
    await next();
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
      ctx.metadata.set('authToken', token);
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
    ctx.metadata.set('totalMs', Math.round(elapsed * 100) / 100);
  },
};

// ─── Component ───

const { bridge } = useBridge();
const { getInfo } = usePlugin(device);
const logs = ref<string[]>([]);
const middlewareRegistered = ref(false);

function addLog(msg: string) {
  logs.value = [...logs.value.slice(-19), msg];
}

if (!middlewareRegistered.value) {
  bridge.use(timingMiddleware);
  bridge.use({
    name: 'logger',
    fn: async (ctx, next) => {
      console.log(`[→] ${ctx.request.action}`, ctx.request.payload);
      await next();
      if (ctx.response?.success) {
        console.log(`[←] ${ctx.request.action} (${Date.now() - ctx.startTime}ms)`, ctx.response.data);
      } else if (ctx.response) {
        console.error(`[✗] ${ctx.request.action}`, ctx.response.error);
      }
    },
  });
  bridge.use(cacheMiddleware);
  bridge.use(createAuthMiddleware(() => 'demo-token-12345'));
  middlewareRegistered.value = true;
  addLog('✓ Middleware registered (timing → logger → cache → auth)');
}

async function handleFetchDevice() {
  addLog('→ Calling device.getInfo...');
  try {
    const result = await getInfo.execute();
    addLog(`← Success: ${JSON.stringify(result).slice(0, 80)}...`);
  } catch (err) {
    addLog(`← Error: ${(err as Error).message}`);
  }
}

async function handleFetchCached() {
  addLog('→ Calling device.getInfo (should be cached)...');
  try {
    const result = await getInfo.execute();
    addLog(`← Cached: ${JSON.stringify(result).slice(0, 80)}...`);
  } catch (err) {
    addLog(`← Error: ${(err as Error).message}`);
  }
}

function handleClearCache() {
  cache.clear();
  addLog('✓ Cache cleared');
}
</script>

<template>
  <div>
    <h1>Middleware Examples</h1>
    <p class="description">
      Demonstrates built-in and custom middleware. Open browser console to see Logger output.
    </p>

    <div class="card">
      <h2>Middleware</h2>
      <p>
        <strong>Cache:</strong> Short-circuits on cache hit (skips native call)<br />
        <strong>Auth:</strong> Injects token into every request payload<br />
        <strong>Timing:</strong> Measures total roundtrip time
      </p>
    </div>

    <div class="card">
      <h2>Try It</h2>
      <div style="display: flex; gap: 8px; flex-wrap: wrap">
        <button class="button" @click="handleFetchDevice">Fetch Device Info</button>
        <button class="button" @click="handleFetchCached">Fetch (Cached)</button>
        <button class="button secondary" @click="handleClearCache">Clear Cache</button>
      </div>
    </div>

    <div class="card">
      <h2>Log</h2>
      <pre style="font-size: 12px; max-height: 300px; overflow: auto">{{
        logs.length === 0 ? 'No logs yet. Click a button above.' : logs.join('\n')
      }}</pre>
    </div>

    <div class="card">
      <h2>Code</h2>
      <pre style="font-size: 11px">// 1. Logger (inline middleware)
bridge.use({
  name: 'logger',
  fn: async (ctx, next) =&gt; {
    console.log('[→]', ctx.request.action);
    await next();
    console.log('[←]', ctx.request.action);
  },
});

// 2. Cache (short-circuit pattern)
const cacheMiddleware: Middleware = {
  name: 'simple-cache',
  fn: async (ctx, next) =&gt; {
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
  fn: async (ctx, next) =&gt; {
    ctx.metadata.set('authToken', getToken());
    await next();
  },
});</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { device } from '@example/plugins';
import type { RequestInterceptor } from '@webview-ts/shared';
import { ref } from 'vue';

import { useBridge, usePlugin } from '../bridge';

// ─── Custom Interceptor: Auth Token Injection ───

function createAuthInterceptor(getToken: () => string | null): RequestInterceptor {
  return {
    name: 'auth-token',
    fn: (request) => {
      const token = getToken();
      if (token) {
        request.payload = {
          ...(request.payload as Record<string, unknown>),
          __authToken: token,
        };
      }
      return request;
    },
  };
}

// ─── Component ───

const { bridge } = useBridge();
const { getInfo } = usePlugin(device);
const logs = ref<string[]>([]);
const interceptorsRegistered = ref(false);

function addLog(msg: string) {
  logs.value = [...logs.value.slice(-19), msg];
}

let unsubLogger: (() => void) | undefined;
let unsubAuth: (() => void) | undefined;

if (!interceptorsRegistered.value) {
  unsubLogger = bridge.interceptors.request.use({
    name: 'logger',
    fn: (request) => {
      console.log(`[→] ${request.action}`, request.payload);
      return request;
    },
  });
  unsubAuth = bridge.interceptors.request.use(createAuthInterceptor(() => 'demo-token-12345'));
  interceptorsRegistered.value = true;
  addLog('✓ Interceptors registered (logger → auth)');
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

function handleCleanup() {
  unsubLogger?.();
  unsubAuth?.();
  addLog('✓ Interceptors removed');
}
</script>

<template>
  <div>
    <h1>Interceptor Examples</h1>
    <p class="description">
      Demonstrates request interceptors. Open browser console to see Logger output.
    </p>

    <div class="card">
      <h2>Interceptors</h2>
      <p>
        <strong>Logger:</strong> Logs every outgoing request<br />
        <strong>Auth:</strong> Injects token into every request payload
      </p>
    </div>

    <div class="card">
      <h2>Try It</h2>
      <div style="display: flex; gap: 8px; flex-wrap: wrap">
        <button class="button" @click="handleFetchDevice">Fetch Device Info</button>
        <button class="button secondary" @click="handleCleanup">Remove Interceptors</button>
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
      <pre style="font-size: 11px">// 1. Logger (request interceptor)
bridge.interceptors.request.use({
  name: 'logger',
  fn: (request) =&gt; {
    console.log('[→]', request.action);
    return request;
  },
});

// 2. Auth token injection
bridge.interceptors.request.use({
  name: 'auth-token',
  fn: (request) =&gt; {
    request.payload = { ...request.payload, token: getToken() };
    return request;
  },
});</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { calendar, device } from '@example/plugins';
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
const { addEvent } = usePlugin(calendar);
const logs = ref<string[]>([]);
const interceptorsRegistered = ref(false);
const lastEventId = ref<string | null>(null);

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
  addLog('✓ Interceptors registered (logger, auth-token)');
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

async function handleAddEvent() {
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
      lastEventId.value = result.id;
      addLog(
        `← Success: id=${result.id} (payload stamped with source="webview-ts-example" by per-action interceptor)`
      );
    }
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
      Demonstrates request interceptor patterns. Open browser console to see Logger output.
    </p>

    <div class="card">
      <h2>Interceptors</h2>
      <p>
        <strong>Logger:</strong> Logs every outgoing request action to console<br />
        <strong>Auth:</strong> Injects token into every request payload
      </p>
    </div>

    <div class="card">
      <h2>Try It</h2>
      <p style="font-size: 12px; color: #94a3b8; margin-bottom: 8px">
        Note: <code>device.getInfo</code> has <code>cache: true</code> — only the
        <strong>first</strong> click crosses the bridge and fires interceptors. Subsequent clicks are
        served from cache (no interceptor logs). Use this as a cache demo, or click
        <strong>Add Calendar Event</strong> for uncached interceptor calls.
      </p>
      <div style="display: flex; gap: 8px; flex-wrap: wrap">
        <button class="button" @click="handleFetchDevice">
          Fetch Device Info (global interceptors)
        </button>
        <button class="button secondary" @click="handleAddEvent">
          Add Calendar Event (per-action stamp-source)
        </button>
        <button class="button secondary" @click="handleCleanup">Remove Interceptors</button>
      </div>
      <div v-if="lastEventId" class="result success" style="margin-top: 8px">
        Event created — id: <code>{{ lastEventId }}</code>. The <code>stamp-source</code> per-action
        interceptor injected <code>source: "webview-ts-example"</code> into the payload before
        dispatch.
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
      <pre style="font-size: 11px">// 1. Inline logger (request interceptor)
const unsub = bridge.interceptors.request.use({
  name: 'logger',
  fn: (request) =&gt; {
    console.log('[→]', request.action);
    return request; // always return the (possibly modified) request
  },
});

// Unsubscribe when done
unsub();

// 2. Auth token injection
bridge.interceptors.request.use({
  name: 'auth-token',
  fn: (request) =&gt; ({
    ...request,
    payload: { ...request.payload, __authToken: getToken() },
  }),
});

// 3. Response interceptor
bridge.interceptors.response.use({
  name: 'error-reporter',
  fn: (response) =&gt; {
    if (!response.success) {
      reportError(response.error);
    }
    return response;
  },
});</pre>
    </div>

    <div class="card">
      <h2>Global vs Per-Action Interceptor</h2>
      <p style="font-size: 13px; color: #6b7280; margin-bottom: 0.75rem">
        The <strong>Add Calendar Event</strong> button above triggers
        <code>calendar.addEvent</code>, which has a per-action <code>stamp-source</code>
        interceptor defined in the plugin itself — it appends
        <code>source: "webview-ts-example"</code> to every <code>addEvent</code> payload
        automatically.
      </p>
      <pre style="font-size: 11px">// ─── Global Interceptor ───
// Runs on EVERY action. Registered at bridge level.
bridge.interceptors.request.use(logger);   // Log all calls
bridge.interceptors.request.use(auth);     // Inject token on all requests

// ─── Per-Action Interceptor (real — calendar plugin) ───
// Defined on the action inside definePlugin. Runs only for addEvent.
const calendar = definePlugin('calendar', {
  addEvent: action&lt;AddEventPayload, AddEventResponse&gt;()
    .interceptors.request.use({
      name: 'stamp-source',
      fn: (req) =&gt; ({
        ...req,
        payload: { ...req.payload, source: 'webview-ts-example' },
      }),
    }),
  getEvents: action&lt;GetEventsPayload, GetEventsResponse&gt;(), // no interceptor
});</pre>
    </div>
  </div>
</template>

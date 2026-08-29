<script setup lang="ts">
import { validationDemo } from '@example/plugins';
import { BridgeCallError } from '@webview-ts/shared';
import { ref } from 'vue';

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

const { getProfile, getBrokenProfile } = usePlugin(validationDemo);
const result = ref<ResultState>({ kind: 'idle' });

async function handleValidCall() {
  result.value = { kind: 'idle' };
  try {
    const data = await getProfile.execute();
    if (data) result.value = { kind: 'success', data };
  } catch (err) {
    if (err instanceof BridgeCallError && err.code === 'VALIDATION_ERROR') {
      const details = err.details as ValidationDetails | undefined;
      result.value = {
        kind: 'validation-error',
        code: err.code,
        side: details?.side ?? 'unknown',
        issues: details?.issues ?? [],
      };
    } else {
      result.value = { kind: 'error', message: (err as Error).message };
    }
  }
}

async function handleBrokenHost() {
  result.value = { kind: 'idle' };
  try {
    const data = await getBrokenProfile.execute();
    if (data) result.value = { kind: 'success', data };
  } catch (err) {
    if (err instanceof BridgeCallError && err.code === 'VALIDATION_ERROR') {
      const details = err.details as ValidationDetails | undefined;
      result.value = {
        kind: 'validation-error',
        code: err.code,
        side: details?.side ?? 'unknown',
        issues: details?.issues ?? [],
      };
    } else {
      result.value = { kind: 'error', message: (err as Error).message };
    }
  }
}
</script>

<template>
  <div>
    <h1>Response Validation</h1>
    <p class="description">
      <strong>Payload validation</strong> (host-inbound) requires a native app — the bridge
      validates request payloads before the native handler runs. This demo focuses on
      <strong>response validation</strong> (<code>client-response</code>): the client checks the
      response schema after receiving it. This catches contract-violating responses from outdated
      native builds — without any native app required.
    </p>

    <div class="card">
      <h2>Try It</h2>
      <div style="display: flex; gap: 8px; flex-wrap: wrap">
        <button class="button" @click="handleValidCall" :disabled="getProfile.isLoading.value">
          {{ getProfile.isLoading.value ? 'Loading…' : 'Valid call (getProfile)' }}
        </button>
        <button
          class="button secondary"
          @click="handleBrokenHost"
          :disabled="getBrokenProfile.isLoading.value"
        >
          {{ getBrokenProfile.isLoading.value ? 'Loading…' : 'Broken host (getBrokenProfile)' }}
        </button>
      </div>
    </div>

    <div v-if="result.kind === 'success'" class="card">
      <h2>Result</h2>
      <div class="result success">
        <p><strong>name:</strong> {{ result.data.name }}</p>
        <p><strong>age:</strong> {{ result.data.age }}</p>
        <p>
          <strong>joinedAt:</strong> {{ result.data.joinedAt }}
          <span style="color: #6b7280; font-size: 12px">
            (Unix ms — {{ new Date(result.data.joinedAt).toISOString() }})
          </span>
        </p>
      </div>
    </div>

    <div v-if="result.kind === 'validation-error'" class="card">
      <h2>Validation Error</h2>
      <div class="result error">
        <p>
          <strong>code:</strong> <code>{{ result.code }}</code>
        </p>
        <p>
          <strong>side:</strong> <code>{{ result.side }}</code>
        </p>
        <p style="margin-top: 0.75rem"><strong>issues:</strong></p>
        <ul style="margin-left: 1.5rem; margin-top: 0.25rem">
          <li v-for="(issue, i) in result.issues" :key="i" style="margin-bottom: 0.25rem">
            <code v-if="issue.path && issue.path.length > 0" style="margin-right: 6px">{{
              issue.path.join('.')
            }}</code>
            {{ issue.message }}
          </li>
        </ul>
      </div>
    </div>

    <div v-if="result.kind === 'error'" class="card">
      <div class="result error">{{ result.message }}</div>
    </div>

    <div class="card">
      <h2>How It Works</h2>
      <pre style="font-size: 11px">
// Plugin definition
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
  if (err instanceof BridgeCallError &amp;&amp; err.code === 'VALIDATION_ERROR') {
    const { side, issues } = err.details;
    // side: 'client-response'
    // issues: [{ path: ['age'], message: '...' }, ...]
  }
}</pre>
    </div>
  </div>
</template>

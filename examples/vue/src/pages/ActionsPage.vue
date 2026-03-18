<script setup lang="ts">
import { useAction, usePlugin } from '../bridge';
import { device } from '@example/plugins';

const deviceInfo = useAction('device.getInfo');
const { getInfo } = usePlugin(device);
</script>

<template>
  <div>
    <h1>useAction vs usePlugin</h1>

    <div class="card">
      <h2>useAction</h2>
      <pre>// Subscribe to a single action by full name
const deviceInfo = useAction('device.getInfo');

deviceInfo.execute()   // trigger
deviceInfo.data        // Ref&lt;response | null&gt;
deviceInfo.isLoading   // Ref&lt;boolean&gt;
deviceInfo.error       // Ref&lt;Error | null&gt;
deviceInfo.status      // Ref&lt;'idle' | 'loading' | 'success' | 'error'&gt;
deviceInfo.reset()     // clear state</pre>
      <button @click="() => deviceInfo.execute()" :disabled="deviceInfo.isLoading.value">
        {{ deviceInfo.isLoading.value ? 'Loading...' : 'Get Device Info' }}
      </button>
      <pre v-if="deviceInfo.data.value" class="result success" style="margin-top: 0.75rem">{{ JSON.stringify(deviceInfo.data.value, null, 2) }}</pre>
      <p v-if="deviceInfo.error.value" class="result error" style="margin-top: 0.75rem">{{ deviceInfo.error.value.message }}</p>
    </div>

    <div class="card">
      <h2>usePlugin</h2>
      <pre>// Subscribe to all actions of a plugin at once
const { getInfo } = usePlugin(device);

getInfo.execute()   // same shape per action
getInfo.data
getInfo.isLoading
getInfo.error
getInfo.status
getInfo.reset()</pre>
      <button @click="() => getInfo.execute()" :disabled="getInfo.isLoading.value">
        {{ getInfo.isLoading.value ? 'Loading...' : 'Get Device Info' }}
      </button>
      <pre v-if="getInfo.data.value" class="result success" style="margin-top: 0.75rem">{{ JSON.stringify(getInfo.data.value, null, 2) }}</pre>
      <p v-if="getInfo.error.value" class="result error" style="margin-top: 0.75rem">{{ getInfo.error.value.message }}</p>
    </div>

    <div class="card">
      <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem">
        <thead>
          <tr style="background: #f8f9fa">
            <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #dee2e6"></th>
            <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #dee2e6">useAction</th>
            <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #dee2e6">usePlugin</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="[label, a, b] in [
            ['Scope', 'single action', 'all actions in a plugin'],
            ['Argument', `useAction('device.getInfo')`, 'usePlugin(device)'],
            ['Returns', '{ execute, data, … }', '{ getInfo, getBattery, … }'],
            ['Events', '—', `.on('name', handler)`],
            ['Analogy', 'useQuery()', 'useQueries([…])'],
          ]" :key="label" style="border-bottom: 1px solid #eee">
            <td style="padding: 6px 12px; font-weight: 500; color: #555">{{ label }}</td>
            <td style="padding: 6px 12px; font-family: monospace; font-size: 0.8rem">{{ a }}</td>
            <td style="padding: 6px 12px; font-family: monospace; font-size: 0.8rem">{{ b }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

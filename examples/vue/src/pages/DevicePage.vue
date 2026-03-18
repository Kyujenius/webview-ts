<script setup lang="ts">
import { usePlugin, useBridge } from '../bridge';
import { device } from '@example/plugins';
import { computed } from 'vue';

const { connectionMode } = useBridge();
const { getInfo } = usePlugin(device);

const handleGetInfo = () => getInfo.execute();
const info = computed(() => getInfo.data.value as Record<string, unknown> | null);
</script>

<template>
  <div>
    <h1>Device Plugin</h1>
    <p class="mode-badge">
      {{ connectionMode === 'native' ? 'Native Bridge'
        : connectionMode === 'fallback' ? 'Fallback (Web)'
        : 'Disconnected' }}
    </p>
    <div class="card">
      <h2>Device Information</h2>
      <button @click="handleGetInfo">Get Device Info</button>
      <div v-if="info" class="result" style="margin-top: 1rem">
        <table style="width: 100%; border-collapse: collapse">
          <tbody>
            <tr v-for="[key, value] in Object.entries(info)" :key="key" style="border-bottom: 1px solid #eee">
              <td style="padding: 6px 8px; font-weight: 500; color: #666">{{ key }}</td>
              <td style="padding: 6px 8px; font-family: monospace">{{ String(value ?? 'N/A') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div v-if="getInfo.error.value" class="result error">{{ getInfo.error.value.message }}</div>
  </div>
</template>

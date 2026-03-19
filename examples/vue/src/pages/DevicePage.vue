<script setup lang="ts">
import { usePlugin, useBridge } from '../bridge';
import { device } from '@example/plugins';
import type { DeviceInfoResponse } from '@example/plugins';
import { computed } from 'vue';
import ModeBadge from '../components/ModeBadge.vue';
import ErrorMessage from '../components/ErrorMessage.vue';

const { connectionMode } = useBridge();
const { getInfo } = usePlugin(device);

const info = computed(() => getInfo.data.value as DeviceInfoResponse | null);
</script>

<template>
  <div>
    <h1>Device Plugin</h1>
    <ModeBadge :connectionMode="connectionMode" fallbackLabel="Fallback (Web)" />
    <div class="card">
      <h2>Device Information</h2>
      <button @click="getInfo.execute()">Get Device Info</button>
      <div v-if="info" class="result" style="margin-top: 1rem">
        <table class="info-table">
          <tbody>
            <tr v-for="[key, value] in Object.entries(info)" :key="key">
              <td>{{ key }}</td>
              <td>{{ String(value ?? 'N/A') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <ErrorMessage :error="getInfo.error.value" />
  </div>
</template>

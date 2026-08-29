<script setup lang="ts">
import { camera, haptics, location } from '@example/plugins';
import { onMounted, onUnmounted, ref } from 'vue';

import { useBridge, usePlugin } from '../bridge';

interface LogEntry {
  id: string;
  action: string;
  status: 'running' | 'success' | 'error';
  duration?: number;
  timestamp: number;
}

const { bridge } = useBridge();
const { impact } = usePlugin(haptics);
const { takePhoto } = usePlugin(camera);
const { getCurrentPosition } = usePlugin(location);
const logs = ref<LogEntry[]>([]);

let unsubStart: (() => void) | undefined;
let unsubEnd: (() => void) | undefined;
let unsubError: (() => void) | undefined;

onMounted(() => {
  unsubStart = bridge.onCall('call:start', (data) => {
    logs.value = [
      { id: data.id, action: data.action, status: 'running', timestamp: data.timestamp },
      ...logs.value.slice(0, 19),
    ];
  });

  unsubEnd = bridge.onCall('call:end', (data) => {
    logs.value = logs.value.map((entry) =>
      entry.id === data.id ? { ...entry, status: 'success', duration: data.duration } : entry
    );
  });

  unsubError = bridge.onCall('call:error', (data) => {
    logs.value = logs.value.map((entry) =>
      entry.id === data.id ? { ...entry, status: 'error', duration: data.duration } : entry
    );
  });
});

onUnmounted(() => {
  unsubStart?.();
  unsubEnd?.();
  unsubError?.();
});

function statusColor(status: LogEntry['status']): string {
  if (status === 'success') return '#22c55e';
  if (status === 'error') return '#ef4444';
  return '#f59e0b';
}

function statusLabel(status: LogEntry['status']): string {
  if (status === 'success') return 'success';
  if (status === 'error') return 'error';
  return 'running…';
}

function handleHapticsImpact() {
  impact.execute({ style: 'medium' }).catch(() => {});
}

function handleTakePhoto() {
  takePhoto.execute({ quality: 0.8 }).catch(() => {});
}

function handleGetLocation() {
  getCurrentPosition.execute().catch(() => {});
}
</script>

<template>
  <div>
    <h1>Call Lifecycle</h1>
    <p class="description">
      Subscribes to <code>call:start</code>, <code>call:end</code>, and
      <code>call:error</code> events via <code>bridge.onCall()</code>. Every bridge call—from any
      plugin—appears in the log below in real time.
    </p>

    <div class="card">
      <h2>Trigger Actions</h2>
      <div style="display: flex; gap: 8px; flex-wrap: wrap">
        <button class="button" @click="handleHapticsImpact">haptics.impact</button>
        <button class="button secondary" @click="handleTakePhoto">camera.takePhoto</button>
        <button class="button secondary" @click="handleGetLocation">
          location.getCurrentPosition
        </button>
      </div>
    </div>

    <div class="card">
      <h2>Live Call Log</h2>
      <div v-if="logs.length === 0" class="result">No calls yet. Click a button above.</div>
      <table v-else style="width: 100%; border-collapse: collapse; font-size: 13px">
        <thead>
          <tr style="text-align: left; border-bottom: 1px solid #e5e7eb">
            <th style="padding: 4px 8px">Action</th>
            <th style="padding: 4px 8px">Status</th>
            <th style="padding: 4px 8px">Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in logs" :key="entry.id" style="border-bottom: 1px solid #f3f4f6">
            <td style="padding: 4px 8px; font-family: monospace">{{ entry.action }}</td>
            <td :style="{ padding: '4px 8px', color: statusColor(entry.status) }">
              {{ statusLabel(entry.status) }}
            </td>
            <td style="padding: 4px 8px; color: #6b7280">
              {{ entry.duration != null ? `${entry.duration}ms` : '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>Code</h2>
      <pre style="font-size: 11px">
const { bridge } = useBridge();
let unsubStart, unsubEnd, unsubError;

onMounted(() => {
  unsubStart = bridge.onCall('call:start', (data) => {
    // data: { id, action, payload, timestamp }
  });
  unsubEnd = bridge.onCall('call:end', (data) => {
    // data: { id, action, response, duration }
  });
  unsubError = bridge.onCall('call:error', (data) => {
    // data: { id, action, error, duration }
  });
});

onUnmounted(() => {
  unsubStart?.();
  unsubEnd?.();
  unsubError?.();
});</pre>
    </div>
  </div>
</template>

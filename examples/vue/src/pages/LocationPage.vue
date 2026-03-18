<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePlugin, useBridge, useEvent } from '../bridge';
import { location } from '@example/plugins';

const { connectionMode } = useBridge();
const { getCurrentPosition, watchPosition, clearWatch } = usePlugin(location);

const watchId = ref<number | null>(null);
const livePosition = ref<{ latitude: number; longitude: number; accuracy: number } | null>(null);
const eventCount = ref(0);

// Native → Web push event
useEvent('location.updated', (pos: { latitude: number; longitude: number; accuracy: number }) => {
  livePosition.value = pos;
  eventCount.value++;
});

const handleGetCurrentPosition = () => getCurrentPosition.execute();

const handleWatchPosition = async () => {
  if (watchId.value !== null) return;
  const res = await watchPosition.execute();
  if (res) watchId.value = res.watchId;
};

const handleClearWatch = async () => {
  if (watchId.value === null) return;
  await clearWatch.execute({ watchId: watchId.value });
  watchId.value = null;
};

const position = computed(() => getCurrentPosition.data.value);
const error = computed(() => getCurrentPosition.error.value ?? watchPosition.error.value ?? clearWatch.error.value);
</script>

<template>
  <div>
    <h1>Location Plugin</h1>
    <div class="result" style="background: #f0f9ff; padding: 0.75rem; margin-bottom: 1rem">
      <strong>Mode:</strong>
      {{ connectionMode === 'native' ? 'Native Bridge'
        : connectionMode === 'fallback' ? 'Fallback (Seoul, KR)'
        : 'Disconnected' }}
    </div>
    <div class="card">
      <h2>Location Actions</h2>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap">
        <button class="button" @click="handleGetCurrentPosition" :disabled="getCurrentPosition.isLoading.value">
          {{ getCurrentPosition.isLoading.value ? 'Loading...' : 'Get Current Position' }}
        </button>
        <button class="button button-secondary" @click="handleWatchPosition" :disabled="watchId !== null">
          {{ watchId !== null ? 'Watching...' : 'Watch Position' }}
        </button>
        <button class="button button-secondary" @click="handleClearWatch" :disabled="watchId === null">
          Clear Watch
        </button>
      </div>
    </div>
    <div v-if="error" class="result error">
      <strong>Error:</strong> {{ error.message }}
    </div>
    <div v-if="position" class="card">
      <h2>Current Position</h2>
      <div class="result success">
        <p><strong>Location:</strong> {{ position.latitude.toFixed(6) }}, {{ position.longitude.toFixed(6) }}</p>
        <p><strong>Accuracy:</strong> ±{{ position.accuracy.toFixed(2) }}m</p>
        <details style="margin-top: 1rem">
          <summary>Full Data</summary>
          <pre>{{ JSON.stringify(position, null, 2) }}</pre>
        </details>
      </div>
    </div>
    <div class="card">
      <h2>Live Position (useEvent)</h2>
      <p style="color: #666; margin-bottom: 0.5rem">
        Listens for <code>location.updated</code> events pushed from Native host.
      </p>
      <div v-if="livePosition" class="result success">
        <p><strong>Live:</strong> {{ livePosition.latitude.toFixed(6) }}, {{ livePosition.longitude.toFixed(6) }}</p>
        <p><strong>Updates received:</strong> {{ eventCount }}</p>
      </div>
      <div v-else class="result">No events received yet.</div>
    </div>
    <div class="card">
      <h2>Usage</h2>
      <pre>// Request-Response + Event — all from usePlugin
const { getCurrentPosition } = usePlugin(location);
const pos = await getCurrentPosition();

// Event: typed subscription
useEvent('location.updated', (pos) => {
  livePosition.value = pos;
});</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBridge } from '../bridge';
const { connectionMode } = useBridge();
</script>

<template>
  <div>
    <h1>TS Bridge Vue Example</h1>
    <div class="card">
      <h2>Bridge Status</h2>
      <p>
        Status:
        <span :class="{
          'status-connected': connectionMode === 'native',
          'status-fallback': connectionMode === 'fallback',
          'status-disconnected': connectionMode === 'disconnected',
        }">
          {{ connectionMode === 'native' ? 'Connected to Native'
            : connectionMode === 'fallback' ? 'Fallback Mode'
            : 'Disconnected' }}
        </span>
      </p>
    </div>
    <div class="card">
      <h2>Features</h2>
      <div class="grid">
        <div><h3>Camera</h3><p>Take photos, pick images</p></div>
        <div><h3>Device</h3><p>Device name, model, OS info</p></div>
      </div>
    </div>
  </div>
</template>

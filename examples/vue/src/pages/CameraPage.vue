<script setup lang="ts">
import { usePlugin, useBridge } from '../bridge';
import { camera } from '@example/plugins';
import { computed } from 'vue';

const { connectionMode } = useBridge();
const { takePhoto, pickImage } = usePlugin(camera);

const handleTakePhoto = () => takePhoto.execute({ quality: 0.8 });
const handlePickImage = () => pickImage.execute({ multiple: false });
const isLoading = computed(() => takePhoto.isLoading.value || pickImage.isLoading.value);
const error = computed(() => takePhoto.error.value ?? pickImage.error.value);
const result = computed(() => takePhoto.data.value ?? pickImage.data.value);
</script>

<template>
  <div>
    <h1>Camera Plugin</h1>
    <div class="result" style="background: #f0f9ff; padding: 0.75rem; margin-bottom: 1rem">
      <strong>Mode:</strong>
      {{ connectionMode === 'native' ? 'Native Bridge'
        : connectionMode === 'fallback' ? 'Fallback (Mock Data)'
        : 'Disconnected' }}
    </div>
    <div class="card">
      <h2>Camera Actions</h2>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap">
        <button class="button" @click="handleTakePhoto" :disabled="isLoading">
          {{ takePhoto.isLoading.value ? 'Loading...' : 'Take Photo' }}
        </button>
        <button class="button button-secondary" @click="handlePickImage" :disabled="isLoading">
          {{ pickImage.isLoading.value ? 'Loading...' : 'Pick Image' }}
        </button>
      </div>
    </div>
    <div v-if="error" class="result error">
      <strong>Error:</strong> {{ error.message }}
    </div>
    <div v-if="result" class="card">
      <h2>Result</h2>
      <div class="result success">
        <p><strong>Image captured successfully!</strong></p>
        <pre>{{ JSON.stringify(result, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePlugin, useBridge } from '../bridge';
import { camera } from '@example/plugins';
import { computed } from 'vue';
import ModeBadge from '../components/ModeBadge.vue';
import ErrorMessage from '../components/ErrorMessage.vue';

const { connectionMode } = useBridge();
const { takePhoto, pickImage } = usePlugin(camera);

const isLoading = computed(() => takePhoto.isLoading.value || pickImage.isLoading.value);
const error = computed(() => takePhoto.error.value ?? pickImage.error.value);
const result = computed(() => takePhoto.data.value ?? pickImage.data.value);
</script>

<template>
  <div>
    <h1>Camera Plugin</h1>
    <ModeBadge :connectionMode="connectionMode" fallbackLabel="Fallback (Mock Data)" />
    <div class="card">
      <h2>Camera Actions</h2>
      <div class="flex-row-gap">
        <button class="button" @click="takePhoto.execute({ quality: 0.8 })" :disabled="isLoading">
          {{ takePhoto.isLoading.value ? 'Loading...' : 'Take Photo' }}
        </button>
        <button
          class="button button-secondary"
          @click="pickImage.execute({ multiple: false })"
          :disabled="isLoading"
        >
          {{ pickImage.isLoading.value ? 'Loading...' : 'Pick Image' }}
        </button>
      </div>
    </div>
    <ErrorMessage :error="error" />
    <div v-if="result" class="card">
      <h2>Result</h2>
      <div class="result success">
        <p><strong>Image captured successfully!</strong></p>
        <pre>{{ JSON.stringify(result, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

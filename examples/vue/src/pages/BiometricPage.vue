<script setup lang="ts">
import { computed } from 'vue';
import { usePlugin, useBridge } from '../bridge';
import { biometric } from '@example/plugins';

const { connectionMode } = useBridge();
const { checkAvailability, authenticate } = usePlugin(biometric);

const handleCheckAvailability = () => checkAvailability.execute();
const handleAuthenticate = () => authenticate.execute({ reason: 'Authenticate to continue' });

const availability = computed(() => checkAvailability.data.value);
const authResult = computed(() => authenticate.data.value);
const error = computed(() => checkAvailability.error.value ?? authenticate.error.value);
const loading = computed(() => checkAvailability.isLoading.value || authenticate.isLoading.value);
</script>

<template>
  <div>
    <h1>Biometric Plugin</h1>
    <div class="result" style="background: #f0f9ff; padding: 0.75rem; margin-bottom: 1rem">
      <strong>Mode:</strong>
      {{ connectionMode === 'native' ? 'Native Bridge'
        : connectionMode === 'fallback' ? 'Fallback (Mock)'
        : 'Disconnected' }}
    </div>
    <div class="card">
      <h2>Check Availability</h2>
      <button class="button" @click="handleCheckAvailability" :disabled="loading">
        {{ checkAvailability.isLoading.value ? 'Checking...' : 'Check Biometric Availability' }}
      </button>
      <div v-if="availability" class="result" style="margin-top: 1rem">
        <p><strong>Available:</strong> {{ availability.available ? 'Yes' : 'No' }}</p>
        <p v-if="availability.biometricTypes.length > 0">
          <strong>Types:</strong> {{ availability.biometricTypes.join(', ') }}
        </p>
      </div>
    </div>
    <div class="card">
      <h2>Authentication</h2>
      <button class="button" @click="handleAuthenticate" :disabled="loading">
        {{ authenticate.isLoading.value ? 'Authenticating...' : 'Authenticate' }}
      </button>
    </div>
    <div v-if="error" class="result error">
      <strong>Error:</strong> {{ error.message }}
    </div>
    <div v-if="authResult" class="card">
      <h2>Authentication Result</h2>
      <div :class="['result', authResult.success ? 'success' : 'error']">
        <p><strong>Success:</strong> {{ authResult.success ? 'Yes' : 'No' }}</p>
        <p v-if="!authResult.success"><strong>Status:</strong> Authentication denied</p>
      </div>
    </div>
    <div class="card">
      <h2>Usage</h2>
      <pre>import { usePlugin } from '../bridge';
import { biometric } from '@example/plugins';

const { checkAvailability, authenticate } = usePlugin(biometric);

const { available, biometricTypes } = await checkAvailability();
const { success } = await authenticate({ reason: 'Verify your identity' });</pre>
    </div>
  </div>
</template>

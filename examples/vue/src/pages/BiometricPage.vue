<script setup lang="ts">
import { computed } from 'vue';
import { usePlugin, useBridge } from '../bridge';
import { biometric } from '@example/plugins';
import ModeBadge from '../components/ModeBadge.vue';
import ErrorMessage from '../components/ErrorMessage.vue';

const { connectionMode } = useBridge();
const { checkAvailability, authenticate } = usePlugin(biometric);

const availability = computed(() => checkAvailability.data.value);
const authResult = computed(() => authenticate.data.value);
const error = computed(() => checkAvailability.error.value ?? authenticate.error.value);
const loading = computed(() => checkAvailability.isLoading.value || authenticate.isLoading.value);
</script>

<template>
  <div>
    <h1>Biometric Plugin</h1>
    <ModeBadge :connectionMode="connectionMode" fallbackLabel="Fallback (Mock)" />
    <div class="card">
      <h2>Check Availability</h2>
      <button class="button" @click="checkAvailability.execute()" :disabled="loading">
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
      <button
        class="button"
        @click="authenticate.execute({ reason: 'Authenticate to continue' })"
        :disabled="loading"
      >
        {{ authenticate.isLoading.value ? 'Authenticating...' : 'Authenticate' }}
      </button>
    </div>
    <ErrorMessage :error="error" />
    <div v-if="authResult" class="card">
      <h2>Authentication Result</h2>
      <div :class="['result', authResult.success ? 'success' : 'error']">
        <p><strong>Success:</strong> {{ authResult.success ? 'Yes' : 'No' }}</p>
        <p v-if="!authResult.success"><strong>Status:</strong> Authentication denied</p>
      </div>
    </div>
    <div class="card">
      <h2>Usage</h2>
      <pre>
import { usePlugin } from '../bridge';
import { biometric } from '@example/plugins';

const { checkAvailability, authenticate } = usePlugin(biometric);

const { available, biometricTypes } = await checkAvailability();
const { success } = await authenticate({ reason: 'Verify your identity' });</pre>
    </div>
  </div>
</template>

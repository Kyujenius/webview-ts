<script setup lang="ts">
import { ref } from 'vue';
import { usePlugin, useBridge } from '../bridge';
import { phone } from '@example/plugins';
import ModeBadge from '../components/ModeBadge.vue';
import ErrorMessage from '../components/ErrorMessage.vue';

const { connectionMode } = useBridge();
const { call } = usePlugin(phone);
const number = ref('');

const handleDigit = (digit: string) => { number.value += digit; };
const handleDelete = () => { number.value = number.value.slice(0, -1); };

const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
</script>

<template>
  <div>
    <h1>Phone</h1>
    <ModeBadge :connectionMode="connectionMode" />
    <div class="card">
      <input
        type="tel"
        v-model="number"
        placeholder="Phone number"
        class="input-tel"
      />
      <div class="dial-grid">
        <button
          v-for="digit in digits"
          :key="digit"
          class="button button-secondary dial-button"
          @click="handleDigit(digit)"
        >
          {{ digit }}
        </button>
      </div>
      <div class="button-group">
        <button class="button button-call" @click="call.execute({ number: number })" :disabled="!number">
          Call
        </button>
        <button class="button button-secondary" @click="handleDelete" :disabled="!number">
          Delete
        </button>
      </div>
    </div>
    <div v-if="call.data.value" class="result success">Dialing {{ number }}...</div>
    <ErrorMessage :error="call.error.value" />
  </div>
</template>

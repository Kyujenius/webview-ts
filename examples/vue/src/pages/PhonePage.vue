<script setup lang="ts">
import { ref } from 'vue';
import { usePlugin, useBridge } from '../bridge';
import { phone } from '@example/plugins';

const { connectionMode } = useBridge();
const { call } = usePlugin(phone);
const number = ref('01058204625');

const handleCall = () => call.execute({ number: number.value });
const handleDigit = (digit: string) => { number.value += digit; };
const handleDelete = () => { number.value = number.value.slice(0, -1); };

const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
</script>

<template>
  <div>
    <h1>Phone</h1>
    <p class="mode-badge">
      {{ connectionMode === 'native' ? 'Native Bridge'
        : connectionMode === 'fallback' ? 'Fallback'
        : 'Disconnected' }}
    </p>
    <div class="card">
      <input
        type="tel"
        v-model="number"
        placeholder="Phone number"
        style="width: 100%; padding: 12px; font-size: 1.5rem; text-align: center; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 12px; font-family: monospace; box-sizing: border-box"
      />
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px">
        <button
          v-for="digit in digits"
          :key="digit"
          class="button button-secondary"
          @click="handleDigit(digit)"
          style="padding: 14px; font-size: 1.1rem"
        >
          {{ digit }}
        </button>
      </div>
      <div class="button-group">
        <button class="button" @click="handleCall" :disabled="!number" style="background: #22c55e">
          Call
        </button>
        <button class="button button-secondary" @click="handleDelete" :disabled="!number">
          Delete
        </button>
      </div>
    </div>
    <div v-if="call.data.value" class="result success">Dialing {{ number }}...</div>
    <div v-if="call.error.value" class="result error">{{ call.error.value.message }}</div>
  </div>
</template>

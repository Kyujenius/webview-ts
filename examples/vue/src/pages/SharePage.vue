<script setup lang="ts">
import { ref } from 'vue';
import { usePlugin, useBridge } from '../bridge';
import { share } from '@example/plugins';

const { connectionMode } = useBridge();
const { share: doShare } = usePlugin(share);

const title = ref('Check this out!');
const message = ref('Hello from webview-ts');
const url = ref('https://github.com');

const handleShare = () => doShare.execute({
  title: title.value || undefined,
  message: message.value || undefined,
  url: url.value || undefined,
});
</script>

<template>
  <div>
    <h1>Share Plugin</h1>
    <p class="mode-badge">
      {{ connectionMode === 'native' ? 'Native Bridge'
        : connectionMode === 'fallback' ? 'Fallback (Web Share API)'
        : 'Disconnected' }}
    </p>
    <div class="card">
      <h2>Share Content</h2>
      <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px">
        <input v-model="title" type="text" placeholder="Title" style="padding: 8px" />
        <input v-model="message" type="text" placeholder="Message" style="padding: 8px" />
        <input v-model="url" type="text" placeholder="URL" style="padding: 8px" />
      </div>
      <button @click="handleShare">Share</button>
      <div v-if="doShare.data.value" class="result" style="margin-top: 1rem">
        {{ doShare.data.value.shared ? 'Shared successfully!' : 'Share was cancelled' }}
      </div>
    </div>
    <div v-if="doShare.error.value" class="result error">{{ doShare.error.value.message }}</div>
  </div>
</template>

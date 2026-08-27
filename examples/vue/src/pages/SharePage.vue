<script setup lang="ts">
import { ref } from 'vue';
import { usePlugin, useBridge } from '../bridge';
import { share } from '@example/plugins';
import ModeBadge from '../components/ModeBadge.vue';
import ErrorMessage from '../components/ErrorMessage.vue';

const { connectionMode } = useBridge();
const { share: doShare } = usePlugin(share);

const title = ref('Check this out!');
const message = ref('Hello from webview-ts');
const url = ref('https://github.com/Kyujenius/webview-ts');
</script>

<template>
  <div>
    <h1>Share Plugin</h1>
    <ModeBadge :connectionMode="connectionMode" fallbackLabel="Fallback (Web Share API)" />
    <div class="card">
      <h2>Share Content</h2>
      <div class="flex-col-gap" style="margin-bottom: 12px">
        <input v-model="title" type="text" placeholder="Title" class="input" />
        <input v-model="message" type="text" placeholder="Message" class="input" />
        <input v-model="url" type="text" placeholder="URL" class="input" />
      </div>
      <button
        @click="
          doShare.execute({
            title: title || undefined,
            message: message || undefined,
            url: url || undefined,
          })
        "
      >
        Share
      </button>
      <div v-if="doShare.data.value" class="result" style="margin-top: 1rem">
        {{ doShare.data.value.shared ? 'Shared successfully!' : 'Share was cancelled' }}
      </div>
    </div>
    <ErrorMessage :error="doShare.error.value" />
  </div>
</template>

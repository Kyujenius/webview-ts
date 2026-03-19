<script setup lang="ts">
defineProps<{
  connectionMode: string;
  fallbackLabel?: string;
}>();

const MODE_CONFIG: Record<string, string> = {
  native: 'Native Bridge',
  fallback: 'Fallback',
  disconnected: 'Disconnected',
};
</script>

<template>
  <p class="mode-badge">
    {{ connectionMode === 'fallback' && fallbackLabel
      ? fallbackLabel
      : MODE_CONFIG[connectionMode] ?? connectionMode }}
  </p>
</template>

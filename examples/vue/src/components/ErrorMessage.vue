<script setup lang="ts">
defineProps<{
  error: Error | null;
}>();
</script>

<template>
  <div v-if="error" class="result error">
    <strong>Error:</strong> {{ error.message }}
  </div>
</template>

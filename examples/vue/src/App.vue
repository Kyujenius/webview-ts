<script setup lang="ts">
const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/camera', label: 'Camera' },
  { to: '/location', label: 'Location' },
  { to: '/biometric', label: 'Biometric' },
  { to: '/phone', label: 'Phone' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/device', label: 'Device' },
  { to: '/share', label: 'Share' },
  { to: '/actions', label: 'useAction' },
] as const;
</script>

<template>
  <div class="container page-content">
    <RouterView />
  </div>

  <nav class="nav">
    <ul>
      <li v-for="link in navLinks" :key="link.to">
        <RouterLink :to="link.to">{{ link.label }}</RouterLink>
      </li>
    </ul>
  </nav>
</template>

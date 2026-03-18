<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();
const isActive = (path: string) => route.path === path ? 'active' : '';
</script>

<template>
  <div class="container page-content">
    <RouterView />
  </div>

  <nav class="nav">
    <ul>
      <li><RouterLink to="/" :class="isActive('/')">Home</RouterLink></li>
      <li><RouterLink to="/camera" :class="isActive('/camera')">Camera</RouterLink></li>
      <li><RouterLink to="/location" :class="isActive('/location')">Location</RouterLink></li>
      <li><RouterLink to="/biometric" :class="isActive('/biometric')">Biometric</RouterLink></li>
      <li><RouterLink to="/phone" :class="isActive('/phone')">Phone</RouterLink></li>
      <li><RouterLink to="/calendar" :class="isActive('/calendar')">Calendar</RouterLink></li>
      <li><RouterLink to="/device" :class="isActive('/device')">Device</RouterLink></li>
      <li><RouterLink to="/share" :class="isActive('/share')">Share</RouterLink></li>
      <li><RouterLink to="/actions" :class="isActive('/actions')">useAction</RouterLink></li>
    </ul>
  </nav>
</template>

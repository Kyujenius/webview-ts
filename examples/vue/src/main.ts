import './styles.css';

import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';

import App from './App.vue';
import { bridge } from './bridge';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./pages/HomePage.vue') },
    { path: '/camera', component: () => import('./pages/CameraPage.vue') },
    { path: '/location', component: () => import('./pages/LocationPage.vue') },
    { path: '/biometric', component: () => import('./pages/BiometricPage.vue') },
    { path: '/phone', component: () => import('./pages/PhonePage.vue') },
    { path: '/calendar', component: () => import('./pages/CalendarPage.vue') },
    { path: '/device', component: () => import('./pages/DevicePage.vue') },
    { path: '/share', component: () => import('./pages/SharePage.vue') },
    { path: '/actions', component: () => import('./pages/ActionsPage.vue') },
    { path: '/middleware', component: () => import('./pages/MiddlewarePage.vue') },
    { path: '/lifecycle', component: () => import('./pages/LifecyclePage.vue') },
    { path: '/validation', component: () => import('./pages/ValidationPage.vue') },
  ],
});

const app = createApp(App);
app.use(router);
app.use(bridge);
app.mount('#app');

import { createBridgeReact } from '@ts-bridge/react';
import { definePlugin } from '@ts-bridge/plugins';

// Define plugins inline — demonstrates how users create their own plugins
const camera = definePlugin<{
  'camera.takePhoto': { payload: { quality?: number }; response: { uri: string; width: number; height: number } };
  'camera.pickImage': { payload: { multiple?: boolean }; response: { images: { uri: string }[] } };
  'camera.recordVideo': { payload: { maxDuration?: number }; response: { uri: string; duration: number } };
}>()({
  name: 'camera',
  methods: (call) => ({
    takePhoto: (opts?: { quality?: number }) => call('camera.takePhoto', opts ?? {}),
    pickImage: (opts?: { multiple?: boolean }) => call('camera.pickImage', opts ?? {}),
    recordVideo: (opts?: { maxDuration?: number }) => call('camera.recordVideo', opts ?? {}),
  }),
});

const storage = definePlugin<{
  'storage.setItem': { payload: { key: string; value: string }; response: Record<string, never> };
  'storage.getItem': { payload: { key: string }; response: { value: string | null } };
  'storage.removeItem': { payload: { key: string }; response: Record<string, never> };
  'storage.clear': { payload: undefined; response: Record<string, never> };
  'storage.getAllKeys': { payload: undefined; response: { keys: string[] } };
}>()({
  name: 'storage',
  methods: (call) => ({
    setItem: (key: string, value: string) => call('storage.setItem', { key, value }),
    getItem: (key: string) => call('storage.getItem', { key }),
    removeItem: (key: string) => call('storage.removeItem', { key }),
    clear: () => call('storage.clear', undefined),
    getAllKeys: () => call('storage.getAllKeys', undefined),
  }),
});

const location = definePlugin<{
  'location.getCurrentPosition': { payload: undefined; response: { latitude: number; longitude: number; accuracy: number } };
  'location.watchPosition': { payload: undefined; response: { watchId: number } };
  'location.clearWatch': { payload: { watchId: number }; response: Record<string, never> };
}>()({
  name: 'location',
  methods: (call) => ({
    getCurrentPosition: () => call('location.getCurrentPosition', undefined),
    watchPosition: () => call('location.watchPosition', undefined),
    clearWatch: (watchId: number) => call('location.clearWatch', { watchId }),
  }),
});

const biometric = definePlugin<{
  'biometric.checkAvailability': { payload: undefined; response: { available: boolean; biometricTypes: string[] } };
  'biometric.authenticate': { payload: { reason?: string }; response: { success: boolean } };
}>()({
  name: 'biometric',
  methods: (call) => ({
    checkAvailability: () => call('biometric.checkAvailability', undefined),
    authenticate: (reason?: string) => call('biometric.authenticate', { reason }),
  }),
});

const haptics = definePlugin<{
  'haptics.impact': { payload: { style?: string }; response: Record<string, never> };
  'haptics.notification': { payload: { type?: string }; response: Record<string, never> };
  'haptics.selection': { payload: undefined; response: Record<string, never> };
}>()({
  name: 'haptics',
  methods: (call) => ({
    impact: (style?: string) => call('haptics.impact', { style }),
    notification: (type?: string) => call('haptics.notification', { type }),
    selection: () => call('haptics.selection', undefined),
  }),
});

// Export plugin instances for usePlugin() in pages
export { camera, storage, location, biometric, haptics };

// In-memory storage for fallback
const memoryStore = new Map<string, string>();

export const { BridgeProvider, useBridge, useAction, useEvent, usePlugin } = createBridgeReact({
  plugins: [camera, storage, location, biometric, haptics],
  config: {
    timeout: 5000,
    fallback: {
      'camera.takePhoto': async () => ({
        uri: 'https://picsum.photos/400/300',
        width: 400,
        height: 300,
      }),
      'camera.pickImage': async (payload: any) => ({
        images: [
          { uri: 'https://picsum.photos/400/300?1' },
          ...(payload?.multiple ? [{ uri: 'https://picsum.photos/400/300?2' }] : []),
        ],
      }),
      'camera.recordVideo': async () => ({
        uri: 'https://example.com/mock-video.mp4',
        duration: 5,
      }),
      'storage.setItem': async (payload: any) => {
        memoryStore.set(payload.key, payload.value);
        return {};
      },
      'storage.getItem': async (payload: any) => ({
        value: memoryStore.get(payload.key) ?? null,
      }),
      'storage.removeItem': async (payload: any) => {
        memoryStore.delete(payload.key);
        return {};
      },
      'storage.clear': async () => {
        memoryStore.clear();
        return {};
      },
      'storage.getAllKeys': async () => ({
        keys: Array.from(memoryStore.keys()),
      }),
      'location.getCurrentPosition': async () => ({
        latitude: 37.5665,
        longitude: 126.978,
        accuracy: 10,
      }),
      'location.watchPosition': async () => ({ watchId: 1 }),
      'location.clearWatch': async () => ({}),
      'biometric.checkAvailability': async () => ({
        available: true,
        biometricTypes: ['fingerprint', 'face'],
      }),
      'biometric.authenticate': async () => ({
        success: true,
      }),
      'haptics.impact': async () => ({}),
      'haptics.notification': async () => ({}),
      'haptics.selection': async () => ({}),
    },
  },
});

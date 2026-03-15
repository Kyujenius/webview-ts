import { createBridgeReact } from '@ts-bridge/react';
import { camera, storage, location, biometric, haptics } from '@example/plugins';

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

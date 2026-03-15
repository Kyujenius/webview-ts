# @ts-bridge/plugins

Standard plugins for ts-bridge - Type-safe WebView-Native communication.

## Overview

This package provides a collection of production-ready plugins for common mobile features:

- 📷 **Camera** - Take photos, pick images, record videos
- 📍 **Location** - Get current position, watch position changes
- 💾 **Storage** - Persistent key-value storage
- 🔐 **Biometric** - Face ID, Touch ID, fingerprint authentication

## Installation

```bash
npm install @ts-bridge/plugins @ts-bridge/core
# or
yarn add @ts-bridge/plugins @ts-bridge/core
# or
pnpm add @ts-bridge/plugins @ts-bridge/core
```

### Native Dependencies

For React Native side, you'll need to install platform-specific libraries:

```bash
# Camera plugin
npm install react-native-image-picker

# Location plugin
npm install @react-native-community/geolocation

# Storage plugin
npm install @react-native-async-storage/async-storage

# Biometric plugin
npm install react-native-biometrics
```

## Usage

### Camera Plugin

```typescript
import { createBridgeManager } from '@ts-bridge/core';
import { createCameraPlugin } from '@ts-bridge/plugins/camera';

const bridge = createBridgeManager();
const camera = createCameraPlugin(bridge);

// Take a photo
const photo = await camera.takePhoto({
  cameraType: 'back',
  quality: 0.8,
  allowEditing: true,
});

console.log('Photo URI:', photo.uri);

// Pick image from gallery
const image = await camera.pickImage({
  mediaType: 'photo',
  allowMultiple: false,
  quality: 0.9,
});

// Record video
const video = await camera.recordVideo({
  maxDuration: 30,
  quality: 'high',
});

// Check/request permission
const permission = await camera.checkPermission('camera');
if (permission.status !== 'granted') {
  await camera.requestPermission('camera');
}
```

### Location Plugin

```typescript
import { createLocationPlugin } from '@ts-bridge/plugins/location';

const location = createLocationPlugin(bridge);

// Get current position
const position = await location.getCurrentPosition({
  accuracy: 'high',
  timeout: 10000,
  maximumAge: 5000,
});

console.log('Latitude:', position.coords.latitude);
console.log('Longitude:', position.coords.longitude);

// Watch position changes
const watchId = await location.watchPosition({
  accuracy: 'high',
  distanceFilter: 10, // meters
  interval: 1000, // ms
  callback: (position) => {
    console.log('Position updated:', position.coords);
  },
});

// Stop watching
await location.clearWatch(watchId);
```

### Storage Plugin

```typescript
import { createStoragePlugin } from '@ts-bridge/plugins/storage';

const storage = createStoragePlugin(bridge);

// Store string
await storage.setItem('username', 'john_doe');

// Retrieve string
const username = await storage.getItem('username');

// Store JSON
await storage.setJSON('user', {
  id: 123,
  name: 'John Doe',
  email: 'john@example.com',
});

// Retrieve JSON
const user = await storage.getJSON('user');

// Multiple operations
await storage.multiSet([
  ['key1', 'value1'],
  ['key2', 'value2'],
]);

const values = await storage.multiGet(['key1', 'key2']);

// Get all keys
const keys = await storage.getAllKeys();

// Clear all
await storage.clear();
```

### Biometric Plugin

```typescript
import { createBiometricPlugin } from '@ts-bridge/plugins/biometric';

const biometric = createBiometricPlugin(bridge);

// Check availability
const availability = await biometric.isAvailable();
console.log('Available:', availability.available);
console.log('Types:', availability.biometricTypes); // ['FaceID'] or ['TouchID', 'Fingerprint']

// Authenticate
const result = await biometric.authenticate({
  promptMessage: 'Authenticate to access secure content',
  cancelButtonText: 'Cancel',
  fallbackButtonText: 'Use Password',
});

if (result.success) {
  console.log('Authentication successful!');
} else {
  console.error('Authentication failed:', result.error);
}

// Simple boolean check
const isAuthenticated = await biometric.simpleAuthenticate();
```

## Plugin Architecture

### Web Side (TypeScript)

Plugins on the web side extend `BaseWebPlugin` and communicate with native via the bridge:

```typescript
import { BaseWebPlugin } from '@ts-bridge/plugins';
import type { BridgeManager } from '@ts-bridge/core';

class MyPlugin extends BaseWebPlugin<'myAction'> {
  constructor(bridge: BridgeManager) {
    super(bridge, {
      name: 'my-plugin',
      version: '1.0.0',
      requiresNative: true,
      permissions: ['my-permission'],
    });
  }

  async handleAction(action: string, payload: any) {
    return this.sendToNative(action, payload);
  }
}
```

### Native Side (React Native)

Plugins on the native side extend `BaseNativePlugin` and implement actual platform functionality:

```typescript
import { BaseNativePlugin } from '@ts-bridge/plugins';

class MyNativePlugin extends BaseNativePlugin<'myAction'> {
  constructor() {
    super({
      name: 'my-plugin',
      version: '1.0.0',
      requiresNative: true,
      permissions: ['my-permission'],
    });
  }

  async handleAction(action: string, payload: any) {
    // Implement native functionality
    return { success: true, data: 'result' };
  }

  async checkPermission(permission: string): Promise<boolean> {
    // Check platform permission
  }

  async requestPermission(permission: string): Promise<boolean> {
    // Request platform permission
  }
}
```

## Type Safety

All plugins are fully typed with TypeScript:

```typescript
import type {
  CameraOptions,
  ImageResult,
  LocationOptions,
  Position,
  AuthenticationOptions,
  AuthenticationResult,
} from '@ts-bridge/plugins';

// Type-safe options
const options: CameraOptions = {
  cameraType: 'back', // ✅ Type-checked
  quality: 0.8, // ✅ Number between 0-1
  // invalid: true // ❌ Type error
};

// Type-safe results
const result: ImageResult = await camera.takePhoto(options);
// result.uri ✅
// result.width ✅
// result.invalid ❌ Type error
```

## Error Handling

All plugins throw descriptive errors:

```typescript
try {
  const photo = await camera.takePhoto();
} catch (error) {
  if (error instanceof Error) {
    console.error('Camera error:', error.message);
  }
}
```

## Permissions

Plugins automatically handle permission checks and requests:

```typescript
// Check before using
const hasPermission = await camera.hasAllPermissions();
if (!hasPermission) {
  const result = await camera.requestPermission('camera');
  if (result.status !== 'granted') {
    console.log('Permission denied');
    return;
  }
}

// Now safe to use camera
await camera.takePhoto();
```

## Mock Mode

For web-only development without React Native:

```typescript
import { createBridgeManager } from '@ts-bridge/core';
import { createCameraPlugin } from '@ts-bridge/plugins/camera';

const bridge = createBridgeManager({
  mockMode: true, // Enable mock mode
});

const camera = createCameraPlugin(bridge);

// Returns mock data in mock mode
const photo = await camera.takePhoto();
```

## API Reference

### Camera Plugin

- `takePhoto(options?: CameraOptions): Promise<ImageResult>`
- `pickImage(options?: PickImageOptions): Promise<ImageResult | ImageResult[]>`
- `recordVideo(options?: VideoOptions): Promise<VideoResult>`
- `checkPermission(permission: CameraPermission): Promise<PermissionResult>`
- `requestPermission(permission: CameraPermission): Promise<PermissionResult>`

### Location Plugin

- `getCurrentPosition(options?: LocationOptions): Promise<Position>`
- `watchPosition(options: WatchPositionOptions): Promise<number>`
- `clearWatch(watchId: number): Promise<void>`
- `checkPermission(type: LocationPermissionType): Promise<PermissionResult>`
- `requestPermission(type: LocationPermissionType): Promise<PermissionResult>`

### Storage Plugin

- `getItem(key: string): Promise<string | null>`
- `setItem(key: string, value: string): Promise<void>`
- `removeItem(key: string): Promise<void>`
- `clear(): Promise<void>`
- `getAllKeys(): Promise<string[]>`
- `multiGet(keys: string[]): Promise<MultiGetResult>`
- `multiSet(pairs: MultiSetInput): Promise<void>`
- `getJSON<T>(key: string): Promise<T | null>`
- `setJSON<T>(key: string, value: T): Promise<void>`

### Biometric Plugin

- `isAvailable(): Promise<BiometricAvailability>`
- `authenticate(options?: AuthenticationOptions): Promise<AuthenticationResult>`
- `getAvailableTypes(): Promise<BiometricType[]>`
- `simpleAuthenticate(): Promise<boolean>`

## License

MIT

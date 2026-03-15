# @ts-bridge/native

React Native host implementation for ts-bridge - handles WebView-to-Native communication.

## Overview

This package provides the React Native side of the ts-bridge library. It receives messages from the WebView, processes them, and sends responses back. It also supports sending events from native to the web.

## Features

- **BridgeHost**: Main orchestrator for handling messages from WebView
- **MessageHandler**: Integration with react-native-webview
- **PluginHost**: Manages native plugins with lifecycle and dependency handling
- **PermissionManager**: OS permission handling for iOS and Android
- **Type-Safe**: Full TypeScript support with strict typing
- **Plugin System**: Extensible architecture for custom native functionality

## Installation

```bash
npm install @ts-bridge/native @ts-bridge/shared react-native-webview
# or
pnpm add @ts-bridge/native @ts-bridge/shared react-native-webview
# or
yarn add @ts-bridge/native @ts-bridge/shared react-native-webview
```

## Usage

### Basic Setup

```typescript
import { createBridgeHost } from '@ts-bridge/native';
import { WebView } from 'react-native-webview';

// Create bridge host bundle
const { bridgeHost, messageHandler, pluginHost, permissionManager } = createBridgeHost({
  bridge: {
    debug: true,
    timeout: 30000,
  },
});

// Register action handlers
bridgeHost.registerAction('getUserData', async (payload) => {
  const userId = payload.userId;
  // Fetch user data from native storage or API
  return {
    id: userId,
    name: 'John Doe',
    email: 'john@example.com',
  };
});

// Use in React component
function App() {
  const webViewRef = React.useRef<WebView>(null);

  React.useEffect(() => {
    // Set WebView reference when mounted
    messageHandler.setWebViewRef(webViewRef.current);

    return () => {
      // Clean up
      messageHandler.setWebViewRef(null);
    };
  }, []);

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: 'https://your-web-app.com' }}
      onMessage={messageHandler.getOnMessageHandler()}
    />
  );
}
```

### Registering Action Handlers

```typescript
// Simple sync handler
bridgeHost.registerAction('getDeviceInfo', () => {
  return {
    platform: Platform.OS,
    version: Platform.Version,
  };
});

// Async handler
bridgeHost.registerAction('fetchUserData', async (payload) => {
  const response = await fetch(`https://api.example.com/users/${payload.userId}`);
  return await response.json();
});

// Handler with context
bridgeHost.registerAction('logEvent', (payload, context) => {
  console.log(`[${context.messageId}] Event:`, payload.eventName);
  return { logged: true };
});
```

### Sending Events to WebView

```typescript
// Send event to web
bridgeHost.emit('locationUpdate', {
  latitude: 37.7749,
  longitude: -122.4194,
});

// Send event without payload
bridgeHost.emit('appDidBecomeActive');
```

### Using Plugins

```typescript
import { createBridgeHost } from '@ts-bridge/native';
import { CameraPlugin } from '@ts-bridge/plugins';

const { bridgeHost, pluginHost } = createBridgeHost();

// Register plugin
await pluginHost.registerPlugin(CameraPlugin);

// Plugin actions are automatically registered on bridge host
// Web can now call 'camera.capture', 'camera.getPermissions', etc.
```

### Permission Management

```typescript
import { PermissionsAndroid } from 'react-native';

// Register permission handler for camera
permissionManager.registerPermission('camera', async () => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA
    );
    return {
      status: granted === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied',
      canAskAgain: granted !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
    };
  } else {
    // iOS permission handling
    // Use react-native-permissions or similar
    return { status: 'granted' };
  }
});

// Check permission
const hasCamera = await permissionManager.hasPermission('camera');

// Request permission
const status = await permissionManager.requestPermission('camera');
```

### Complete Example with React Native

```typescript
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { createBridgeHost } from '@ts-bridge/native';

// Create bridge host (outside component to avoid recreating)
const { bridgeHost, messageHandler } = createBridgeHost({
  bridge: { debug: __DEV__ },
});

// Register actions
bridgeHost.registerAction('showToast', (payload) => {
  // Show native toast
  console.log('Toast:', payload.message);
  return { shown: true };
});

bridgeHost.registerAction('getDeviceInfo', () => {
  return {
    platform: Platform.OS,
    version: String(Platform.Version),
  };
});

export default function App() {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    // Connect WebView
    messageHandler.setWebViewRef(webViewRef.current);

    return () => {
      // Disconnect
      messageHandler.setWebViewRef(null);
    };
  }, []);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://your-web-app.com' }}
        onMessage={messageHandler.getOnMessageHandler()}
        javaScriptEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

## API

### createBridgeHost(options?)

Creates a complete bridge host bundle with all components.

**Options:**
- `bridge` - BridgeHost configuration
- `messageHandler` - MessageHandler configuration
- `pluginHost` - PluginHost configuration
- `permissionManager` - PermissionManager configuration

**Returns:** `BridgeHostBundle` with:
- `bridgeHost` - BridgeHost instance
- `messageHandler` - MessageHandler instance
- `pluginHost` - PluginHost instance
- `permissionManager` - PermissionManager instance

### BridgeHost

Main orchestrator for handling WebView messages.

**Methods:**
- `registerAction(action, handler)` - Register action handler
- `unregisterAction(action)` - Unregister action handler
- `registerPlugin(plugin)` - Register native plugin
- `unregisterPlugin(pluginName)` - Unregister plugin
- `emit(event, payload?)` - Send event to WebView
- `destroy()` - Clean up resources

### MessageHandler

Integrates BridgeHost with react-native-webview.

**Methods:**
- `setWebViewRef(ref)` - Set WebView reference
- `getOnMessageHandler()` - Get handler for WebView's onMessage prop

### PluginHost

Manages native plugins with lifecycle handling.

**Methods:**
- `registerPlugin(plugin)` - Register and initialize plugin
- `unregisterPlugin(pluginName)` - Unregister and destroy plugin
- `getPlugin(pluginName)` - Get plugin instance
- `getPluginState(pluginName)` - Get plugin state
- `isPluginInitialized(pluginName)` - Check if plugin is initialized
- `destroy()` - Clean up all plugins

### PermissionManager

Handles OS permissions for iOS and Android.

**Methods:**
- `registerPermission(permission, handler)` - Register permission handler
- `checkPermission(permission)` - Check permission status
- `requestPermission(permission)` - Request permission
- `hasPermission(permission)` - Check if permission is granted
- `requestPermissions(permissions)` - Request multiple permissions
- `clearCache(permission?)` - Clear permission cache

## Creating Native Plugins

```typescript
import type { NativePlugin, BridgeHost } from '@ts-bridge/native';

export const MyNativePlugin: NativePlugin = {
  metadata: {
    name: 'myPlugin',
    version: '1.0.0',
    description: 'My custom native plugin',
  },

  async initialize(bridgeHost: BridgeHost) {
    // Register action handlers
    bridgeHost.registerAction('myPlugin.doSomething', async (payload) => {
      // Native implementation
      return { result: 'success' };
    });
  },

  async destroy() {
    // Cleanup
  },
};
```

## Type Safety

All actions and events are fully typed when using TypeScript:

```typescript
interface GetUserPayload {
  userId: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
}

bridgeHost.registerAction<GetUserPayload, UserData>('getUserData', async (payload) => {
  // payload is typed as GetUserPayload
  const userId = payload.userId;

  // Return must match UserData
  return {
    id: userId,
    name: 'John',
    email: 'john@example.com',
  };
});
```

## Error Handling

```typescript
const bridgeHost = new BridgeHost({
  onError: (error, context) => {
    // Custom error handling
    console.error('Bridge error:', error);

    // Report to error tracking service
    Sentry.captureException(error, { extra: context });
  },
});

// Errors in handlers are automatically caught and sent as error responses
bridgeHost.registerAction('riskyAction', async () => {
  throw new Error('Something went wrong');
  // Web side will receive error response
});
```

## License

MIT

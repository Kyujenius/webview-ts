# Custom Plugin Guide

## Overview

In ts-bridge, a **plugin** is a typed action bundle — a set of related bridge actions grouped under a name with fully typed methods. Plugins are not runtime abstractions; they are thin wrappers that provide type-safe method signatures for calling native actions from the web side and handling them on the host side.

## Step 1: Define Actions

Define a TypeScript type that maps action names to their payload/response shapes.

```typescript
// notifications-plugin.ts

export type NotificationActions = {
  'notifications.show': {
    payload: { title: string; body: string; priority?: 'low' | 'default' | 'high' };
    response: { id: string };
  };
  'notifications.cancel': {
    payload: { id: string };
    response: { success: boolean };
  };
  'notifications.getBadgeCount': {
    payload: {};
    response: { count: number };
  };
};
```

Each key is an action name (namespaced by convention). Each value has `payload` (what the web sends) and `response` (what the host returns).

## Step 2: Create the Plugin

Use `definePlugin` to create a plugin instance. The curried call `definePlugin<TActions>()(...)` enables TypeScript to infer method return types while you explicitly provide the action map.

```typescript
import { definePlugin } from '@ts-bridge/plugins';
import type { NotificationActions } from './notifications-plugin';

export const notifications = definePlugin<NotificationActions>()({
  name: 'notifications',
  methods: (call) => ({
    show: (opts: { title: string; body: string; priority?: 'low' | 'default' | 'high' }) =>
      call('notifications.show', opts),
    cancel: (id: string) =>
      call('notifications.cancel', { id }),
    getBadgeCount: () =>
      call('notifications.getBadgeCount', {}),
  }),
});
```

The `call` function is fully typed — action names autocomplete, payloads are checked, and return types are inferred.

## Step 3: Web Setup

Pass the plugin to `createBridgeReact`. This merges the plugin's action types into the bridge.

```typescript
// bridge.ts
import { createBridgeReact } from '@ts-bridge/react';
import { notifications } from './notifications-plugin';

export const {
  BridgeProvider,
  useBridge,
  useAction,
  usePlugin,
} = createBridgeReact({
  plugins: [notifications],
});
```

Wrap your app with `BridgeProvider`:

```tsx
import { BridgeProvider } from './bridge';

function App() {
  return (
    <BridgeProvider>
      <MyApp />
    </BridgeProvider>
  );
}
```

## Step 4: Use in Components

Call `usePlugin` with the plugin instance to get typed methods.

```tsx
import { usePlugin } from './bridge';
import { notifications } from './notifications-plugin';

function NotifyButton() {
  const { show, getBadgeCount } = usePlugin(notifications);

  const handlePress = async () => {
    const { id } = await show({ title: 'Hello', body: 'World' });
    //      ^? string
    console.log('Notification scheduled:', id);

    const { count } = await getBadgeCount();
    //      ^? number
    console.log('Badge count:', count);
  };

  return <button onClick={handlePress}>Send Notification</button>;
}
```

All method arguments and return values are fully typed — no manual type annotations needed.

## Step 5: Host Setup (React Native)

On the native side, call `.host()` on the plugin to register handlers. Each handler receives the typed payload and must return the typed response.

```tsx
import { useBridgeHost } from '@ts-bridge/react-native';
import { notifications } from './notifications-plugin';

function WebViewScreen() {
  const { webViewProps } = useBridgeHost({
    plugins: [
      notifications.host({
        'notifications.show': async (payload) => {
          // payload: { title: string; body: string; priority?: 'low' | 'default' | 'high' }
          const id = await NativeNotifications.schedule(payload);
          return { id }; // must match { id: string }
        },
        'notifications.cancel': async (payload) => {
          await NativeNotifications.cancel(payload.id);
          return { success: true };
        },
        'notifications.getBadgeCount': async () => {
          const count = await NativeNotifications.getBadgeCount();
          return { count };
        },
      }),
    ],
  });

  return <WebView {...webViewProps} source={{ uri: WEB_URL }} />;
}
```

## Full Example

```
your-project/
├── shared/
│   └── notifications-plugin.ts    # Action types + plugin definition
├── web/
│   ├── bridge.ts                  # createBridgeReact({ plugins: [notifications] })
│   └── NotifyButton.tsx           # usePlugin(notifications)
└── native/
    └── WebViewScreen.tsx           # notifications.host({...})
```

**shared/notifications-plugin.ts**

```typescript
import { definePlugin } from '@ts-bridge/plugins';

export type NotificationActions = {
  'notifications.show': {
    payload: { title: string; body: string; priority?: 'low' | 'default' | 'high' };
    response: { id: string };
  };
  'notifications.cancel': {
    payload: { id: string };
    response: { success: boolean };
  };
  'notifications.getBadgeCount': {
    payload: {};
    response: { count: number };
  };
};

export const notifications = definePlugin<NotificationActions>()({
  name: 'notifications',
  methods: (call) => ({
    show: (opts: { title: string; body: string; priority?: 'low' | 'default' | 'high' }) =>
      call('notifications.show', opts),
    cancel: (id: string) => call('notifications.cancel', { id }),
    getBadgeCount: () => call('notifications.getBadgeCount', {}),
  }),
});
```

**web/bridge.ts**

```typescript
import { createBridgeReact } from '@ts-bridge/react';
import { notifications } from '../shared/notifications-plugin';

export const { BridgeProvider, useBridge, usePlugin } = createBridgeReact({
  plugins: [notifications],
});
```

**web/NotifyButton.tsx**

```tsx
import { usePlugin } from './bridge';
import { notifications } from '../shared/notifications-plugin';

export function NotifyButton() {
  const { show } = usePlugin(notifications);

  return (
    <button onClick={() => show({ title: 'Hello', body: 'From the web!' })}>
      Notify
    </button>
  );
}
```

**native/WebViewScreen.tsx**

```tsx
import { WebView } from 'react-native-webview';
import { useBridgeHost } from '@ts-bridge/react-native';
import { notifications } from '../shared/notifications-plugin';

export function WebViewScreen() {
  const { webViewProps } = useBridgeHost({
    plugins: [
      notifications.host({
        'notifications.show': async ({ title, body, priority }) => {
          const id = await scheduleNotification(title, body, priority);
          return { id };
        },
        'notifications.cancel': async ({ id }) => {
          await cancelNotification(id);
          return { success: true };
        },
        'notifications.getBadgeCount': async () => {
          return { count: await getBadgeCount() };
        },
      }),
    ],
  });

  return <WebView {...webViewProps} source={{ uri: 'https://your-app.com' }} />;
}
```

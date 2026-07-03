# TS Bridge Example App

Example application demonstrating the usage of all `@ts-bridge` packages.

## Features

- **Camera Plugin**: Take photos, pick images, and record videos
- **Location Plugin**: Get current position and watch location changes
- **Storage Plugin**: Persistent key-value storage with JSON support
- **Biometric Plugin**: Fingerprint and Face ID authentication
- **DevTools**: Real-time communication monitoring and debugging

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

This will start the development server at [http://localhost:3000](http://localhost:3000).

### Build

```bash
pnpm build
```

### Preview Production Build

```bash
pnpm preview
```

### Export Plugin Contracts

```bash
cd ../plugins && pnpm schema:export
```

This exports all plugin contracts to JSON Schema files in the `plugins/schemas` directory, useful for documentation and cross-language codegen.

## Project Structure

```
src/
├── components/       # Reusable React components
├── pages/           # Page components for each plugin demo
│   ├── HomePage.tsx
│   ├── CameraPage.tsx
│   ├── LocationPage.tsx
│   ├── StoragePage.tsx
│   ├── BiometricPage.tsx
│   ├── DevicePage.tsx
│   ├── PhonePage.tsx
│   ├── CalendarPage.tsx
│   ├── SharePage.tsx
│   ├── ActionsPage.tsx
│   ├── LifecyclePage.tsx          # Demonstrates onCall lifecycle events
│   ├── MiddlewarePage.tsx         # Demonstrates request/response interceptors
│   └── ValidationPage.tsx         # Demonstrates schema validation and error handling
├── hooks/           # Custom React hooks
│   └── useBridge.ts # Bridge manager hook
├── App.tsx          # Main app component with routing
├── main.tsx         # App entry point
└── styles.css       # Global styles
```

## Usage in React Native

To use this app inside a React Native WebView:

1. Build the app: `pnpm build`
2. Host the `dist` folder
3. Configure your React Native app with `@webview-ts/native`
4. Load the app URL in a WebView component

Example React Native setup:

```tsx
import { WebView } from 'react-native-webview';
import { useBridgeHost } from '@webview-ts/native';
import { camera } from '../shared/camera-plugin';

function WebViewScreen() {
  const { webViewProps } = useBridgeHost({
    plugins: [
      camera.host({
        'camera.takePhoto': async ({ quality }) => {
          const photo = await NativeCamera.take({ quality });
          return { uri: photo.uri, width: photo.width, height: photo.height };
        },
      }),
    ],
  });

  return <WebView {...webViewProps} source={{ uri: 'http://localhost:3000' }} />;
}
```

## Web-Only Mode

The app works in web-only mode without React Native, using mock implementations for all native features. This allows you to:

- Develop and test the UI without a mobile device
- Debug communication flows
- Demonstrate the API usage

## License

MIT

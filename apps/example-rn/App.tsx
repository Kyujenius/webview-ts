import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { useBridgeHost } from '@ts-bridge/native';
import { camera, storage, location, biometric, haptics } from '@ts-bridge/plugins';

// In-memory storage (simulating AsyncStorage)
const memoryStore = new Map<string, string>();

// Web app URL — change to your dev server or production URL
const WEB_APP_URL = 'http://localhost:3001';

export default function App() {
  const { webViewProps } = useBridgeHost({
    plugins: [
      camera.host({
        'camera.takePhoto': async (payload) => {
          console.log('[Host] camera.takePhoto', payload);
          return {
            uri: 'https://picsum.photos/1920/1080',
            width: 1920,
            height: 1080,
          };
        },
        'camera.pickImage': async (payload) => {
          console.log('[Host] camera.pickImage', payload);
          return {
            images: [{ uri: 'https://picsum.photos/800/600' }],
          };
        },
        'camera.recordVideo': async (payload) => {
          console.log('[Host] camera.recordVideo', payload);
          return { uri: 'file://mock-video.mp4', duration: payload.maxDuration ?? 30 };
        },
      }),

      storage.host({
        'storage.getItem': async (payload) => {
          console.log('[Host] storage.getItem', payload.key);
          return { value: memoryStore.get(payload.key) ?? null };
        },
        'storage.setItem': async (payload) => {
          console.log('[Host] storage.setItem', payload.key, payload.value);
          memoryStore.set(payload.key, payload.value);
          return {};
        },
        'storage.removeItem': async (payload) => {
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
      }),

      location.host({
        'location.getCurrentPosition': async () => {
          console.log('[Host] location.getCurrentPosition');
          return { latitude: 37.5665, longitude: 126.978, accuracy: 5 };
        },
        'location.watchPosition': async () => {
          console.log('[Host] location.watchPosition');
          return { watchId: 1 };
        },
        'location.clearWatch': async () => {
          console.log('[Host] location.clearWatch');
          return {};
        },
      }),

      biometric.host({
        'biometric.checkAvailability': async () => {
          console.log('[Host] biometric.checkAvailability');
          return { available: true, biometricTypes: ['fingerprint'] };
        },
        'biometric.authenticate': async (payload) => {
          console.log('[Host] biometric.authenticate', payload.promptMessage);
          return { success: true };
        },
      }),

      haptics.host({
        'haptics.impact': async (payload) => {
          console.log('[Host] haptics.impact', payload.style);
          return {};
        },
        'haptics.notification': async (payload) => {
          console.log('[Host] haptics.notification', payload.type);
          return {};
        },
        'haptics.selection': async () => {
          console.log('[Host] haptics.selection');
          return {};
        },
      }),
    ],
    debug: true,
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>ts-bridge Host</Text>
      </View>
      <WebView
        {...webViewProps}
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
      />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1a1a2e',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  headerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  webview: {
    flex: 1,
  },
});

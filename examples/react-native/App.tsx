import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { useBridgeHost } from '@webview-ts/native';
import { cameraHost, storageHost, locationHost, biometricHost, hapticsHost } from './hosts';
import { setLocationSendEvent } from './hosts/location';

const WEB_APP_URL = 'http://localhost:3001';

export default function App() {
  const { webViewProps, sendEvent } = useBridgeHost({
    plugins: [cameraHost, storageHost, locationHost, biometricHost, hapticsHost],
    debug: true,
  });

  // Wire up sendEvent so location host can push events to web
  setLocationSendEvent(sendEvent);

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.headerText}>webview-ts Host</Text>
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
    </>
  );
}

const styles = StyleSheet.create({
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

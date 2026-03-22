import { StyleSheet, SafeAreaView, View, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { useBridgeHost } from '@webview-ts/react-native';
import {
  cameraHost,
  locationHost,
  biometricHost,
  hapticsHost,
  phoneHost,
  calendarHost,
  deviceHost,
  shareHost,
} from './hosts';
import { hostLogger, permissionGuard, rateLimiter } from './middleware';

const WEB_APP_URL = 'http://localhost:3000';

export default function App() {
  const { webViewProps } = useBridgeHost({
    plugins: [
      cameraHost,
      locationHost,
      biometricHost,
      hapticsHost,
      phoneHost,
      calendarHost,
      deviceHost,
      shareHost,
    ],
    middleware: [hostLogger, permissionGuard, rateLimiter],
    debug: true,
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>HOST</Text>
        </View>
        <Text style={styles.headerText}>React Native</Text>
      </View>
      <View style={styles.clientArea}>
        <View style={styles.clientHeader}>
          <View style={styles.clientBadge}>
            <Text style={styles.badgeText}>CLIENT</Text>
          </View>
          <Text style={styles.clientHeaderText}>WebView</Text>
        </View>
        <WebView
          {...webViewProps}
          source={{ uri: WEB_APP_URL }}
          style={styles.webview}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#6366f1',
    padding: 6,
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 8,
  },
  badge: {
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  clientArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  clientHeader: {
    backgroundColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 8,
  },
  clientBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  clientHeaderText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  webview: {
    flex: 1,
  },
});

import { useBridgeHost } from '@webview-ts/react-native';
import { ConnectionRegistry, TARGET } from '@webview-ts/shared';
import { useCallback, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

import {
  biometricHost,
  calendarHost,
  cameraHost,
  clipboardHost,
  deviceHost,
  hapticsHost,
  locationHost,
  phoneHost,
  shareHost,
  storageHost,
  validationDemoHost,
} from './hosts';

const WEB_APP_URL = 'http://localhost:3000';

const PLUGINS = [
  cameraHost,
  locationHost,
  biometricHost,
  hapticsHost,
  phoneHost,
  calendarHost,
  deviceHost,
  shareHost,
  storageHost,
  clipboardHost,
  validationDemoHost,
];

export default function App() {
  // Shared registry — one instance for both WebViews
  const registry = useMemo(() => new ConnectionRegistry(), []);

  // Both WebViews stay mounted (bridge connections alive); tabs only toggle visibility
  const [activeTab, setActiveTab] = useState<'A' | 'B'>('A');

  const hostA = useBridgeHost({
    registry,
    name: 'webview-A',
    plugins: PLUGINS,
    // Pass registry in config so bridgeHost.sendEvent can route via registry
    config: { registry },
  });

  const hostB = useBridgeHost({
    registry,
    name: 'webview-B',
    plugins: PLUGINS,
    config: { registry },
  });

  // Each button sends a different AppStateStatus string so the /device page in each WebView
  // shows a clearly distinct value. Navigate both WebViews to /device to observe routing.
  const sendToA = useCallback(() => {
    hostA.bridgeHost.sendEvent('device.appStateChanged', 'active' as const, {
      target: hostA.sourceId,
    });
  }, [hostA]);

  const sendToB = useCallback(() => {
    hostA.bridgeHost.sendEvent('device.appStateChanged', 'background' as const, {
      target: hostB.sourceId,
    });
  }, [hostA, hostB]);

  const broadcast = useCallback(() => {
    hostA.bridgeHost.sendEvent('device.appStateChanged', 'inactive' as const, {
      target: TARGET.BROADCAST,
    });
  }, [hostA]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>HOST</Text>
        </View>
        <Text style={styles.headerText}>React Native — Multi-WebView</Text>
      </View>

      {/* Event routing buttons — navigate both WebViews to /device to observe appStateChanged */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.btn} onPress={sendToA}>
          <Text style={styles.btnText}>Event → A</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={sendToB}>
          <Text style={styles.btnText}>Event → B</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnBroadcast]} onPress={broadcast}>
          <Text style={styles.btnText}>Broadcast</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.hintRow}>
        <Text style={styles.hintText}>
          Tip: navigate both WebViews to /device to see routed events appear in real time
        </Text>
      </View>

      {/* Tab bar — both WebViews stay mounted below; tabs only switch which one is visible */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'A' && styles.tabActiveA]}
          onPress={() => setActiveTab('A')}
        >
          <Text style={[styles.tabText, activeTab === 'A' && styles.tabTextActive]}>WebView A</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'B' && styles.tabActiveB]}
          onPress={() => setActiveTab('B')}
        >
          <Text style={[styles.tabText, activeTab === 'B' && styles.tabTextActive]}>WebView B</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.webviewRow}>
        <View style={[styles.webviewPane, activeTab !== 'A' && styles.paneHidden]}>
          <WebView
            {...hostA.webViewProps}
            source={{ uri: WEB_APP_URL }}
            style={styles.webview}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
          />
        </View>

        <View style={[styles.webviewPane, activeTab !== 'B' && styles.paneHidden]}>
          <WebView
            {...hostB.webViewProps}
            source={{ uri: WEB_APP_URL }}
            style={styles.webview}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
          />
        </View>
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
  buttonRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  btn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  btnBroadcast: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  btnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  hintRow: {
    paddingHorizontal: 6,
    paddingBottom: 4,
  },
  hintText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontStyle: 'italic',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  tab: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabActiveA: {
    backgroundColor: '#22c55e',
  },
  tabActiveB: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#fff',
  },
  webviewRow: {
    flex: 1,
  },
  webviewPane: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  paneHidden: {
    display: 'none',
  },
  webview: {
    flex: 1,
  },
});

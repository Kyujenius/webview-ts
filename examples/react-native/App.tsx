import { useBridgeHost } from '@webview-ts/react-native';
import { ConnectionRegistry, TARGET } from '@webview-ts/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

type CallLog = {
  id: string;
  type: 'start' | 'end' | 'error';
  action: string;
  detail: string;
  ts: number;
};

export default function App() {
  // Shared registry — one instance for both WebViews
  const registry = useMemo(() => new ConnectionRegistry(), []);

  const [logs, setLogs] = useState<CallLog[]>([]);

  const addLog = useCallback((entry: CallLog) => {
    setLogs((prev) => [entry, ...prev].slice(0, 5));
  }, []);

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

  // Subscribe to onCall lifecycle events on both hosts.
  // In production this is where you would ship telemetry to Datadog / Sentry.
  useEffect(() => {
    const unsubs = [
      hostA.bridgeHost.onCall('call:start', (d) =>
        addLog({ id: d.id, type: 'start', action: d.action, detail: 'A ▶', ts: d.timestamp })
      ),
      hostA.bridgeHost.onCall('call:end', (d) =>
        addLog({
          id: d.id,
          type: 'end',
          action: d.action,
          detail: `A ✓ ${d.duration}ms`,
          ts: Date.now(),
        })
      ),
      hostA.bridgeHost.onCall('call:error', (d) =>
        addLog({
          id: d.id,
          type: 'error',
          action: d.action,
          detail: `A ✗ ${d.error.message}`,
          ts: Date.now(),
        })
      ),
      hostB.bridgeHost.onCall('call:start', (d) =>
        addLog({ id: d.id, type: 'start', action: d.action, detail: 'B ▶', ts: d.timestamp })
      ),
      hostB.bridgeHost.onCall('call:end', (d) =>
        addLog({
          id: d.id,
          type: 'end',
          action: d.action,
          detail: `B ✓ ${d.duration}ms`,
          ts: Date.now(),
        })
      ),
      hostB.bridgeHost.onCall('call:error', (d) =>
        addLog({
          id: d.id,
          type: 'error',
          action: d.action,
          detail: `B ✗ ${d.error.message}`,
          ts: Date.now(),
        })
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [hostA.bridgeHost, hostB.bridgeHost, addLog]);

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

      {/* Two WebViews split vertically */}
      <View style={styles.webviewRow}>
        <View style={styles.webviewPane}>
          <View style={styles.clientHeader}>
            <View style={styles.clientBadge}>
              <Text style={styles.badgeText}>A</Text>
            </View>
            <Text style={styles.clientHeaderText}>WebView A</Text>
          </View>
          <WebView
            {...hostA.webViewProps}
            source={{ uri: WEB_APP_URL }}
            style={styles.webview}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
          />
        </View>

        <View style={styles.webviewPane}>
          <View style={styles.clientHeader}>
            <View style={[styles.clientBadge, styles.clientBadgeB]}>
              <Text style={styles.badgeText}>B</Text>
            </View>
            <Text style={styles.clientHeaderText}>WebView B</Text>
          </View>
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

      {/* Host-side call log — last 5 entries.
          In production this is where you would forward telemetry to Datadog / Sentry. */}
      <View style={styles.logPanel}>
        <Text style={styles.logTitle}>Bridge call log (last 5)</Text>
        {logs.length === 0 ? (
          <Text style={styles.logEmpty}>No calls yet — interact with either WebView</Text>
        ) : (
          logs.map((log, i) => (
            <Text
              key={`${log.id}-${i}`}
              style={[styles.logEntry, log.type === 'error' && styles.logError]}
            >
              {log.detail} · {log.action}
            </Text>
          ))
        )}
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
  webviewRow: {
    flex: 1,
    flexDirection: 'column',
    gap: 4,
  },
  webviewPane: {
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
  clientBadgeB: {
    backgroundColor: '#3b82f6',
  },
  clientHeaderText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  webview: {
    flex: 1,
  },
  logPanel: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    padding: 8,
    marginTop: 4,
    minHeight: 80,
  },
  logTitle: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  logEmpty: {
    color: '#94a3b8',
    fontSize: 11,
    fontStyle: 'italic',
  },
  logEntry: {
    color: '#e2e8f0',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  logError: {
    color: '#fca5a5',
  },
});

/**
 * The shell (parent page) — plays the role the native app plays on mobile:
 * one BridgeHost per iframe, a shared ConnectionRegistry for routing.
 */
import type { BridgeHost } from '@webview-ts/core';
import { createBridgeHost, IframeHostAdapter } from '@webview-ts/core';
import { ConnectionRegistry, TARGET } from '@webview-ts/shared';

import { shell } from './plugins';

// The frames' origin — same-origin demo uses location.origin. Cross-origin
// embedding: replace with the frames' real origin (e.g. 'https://app.example.com').
const CHILD_ORIGIN = location.origin;

const registry = new ConnectionRegistry();
const hosts = new Map<string, BridgeHost>();
const logEl = document.getElementById('log')!;

function log(line: string) {
  const time = new Date().toLocaleTimeString();
  logEl.textContent = `[${time}] ${line}\n` + logEl.textContent;
}

function showToast(message: string) {
  const el = document.getElementById('toast')!;
  el.textContent = message;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 2200);
}

function mountFrame(frameId: 'frame-A' | 'frame-B') {
  const frame = document.getElementById(frameId) as HTMLIFrameElement;
  const adapter = new IframeHostAdapter(frame, CHILD_ORIGIN);

  // The neutral core factory — same call every platform binding wraps.
  // The adapter is the ONLY platform-specific ingredient.
  const { bridgeHost } = createBridgeHost({
    adapter,
    config: { registry },
    plugins: [
      shell.host({
        getUser: async () => ({ name: `User of ${frameId}`, role: 'member' }),
        showToast: async ({ message }) => {
          showToast(`${frameId}: ${message}`);
          log(`${frameId} → showToast("${message}")`);
          return { shown: true };
        },
      }),
    ],
  });

  // Register under a stable id so events can target this frame
  registry.register(frameId, (message) => adapter.send(message));
  hosts.set(frameId, bridgeHost);
}

mountFrame('frame-A');
mountFrame('frame-B');

// ── Routing demo buttons ──
let theme: 'light' | 'dark' = 'light';
const anyHost = () => hosts.get('frame-A')!;

document.getElementById('broadcast')!.addEventListener('click', () => {
  theme = theme === 'light' ? 'dark' : 'light';
  anyHost().sendEvent('shell.themeChanged', { theme }, { target: TARGET.BROADCAST });
  log(`broadcast → themeChanged(${theme})`);
});

document.getElementById('ping-b')!.addEventListener('click', () => {
  anyHost().sendEvent('shell.ping', { from: 'shell' }, { target: 'frame-B' });
  log('target frame-B → ping (frame-A must stay silent)');
});

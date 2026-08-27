/**
 * An embedded frame (runs inside an iframe) — plays the role the web app
 * plays inside a mobile WebView. Open child.html directly (no shell) and the
 * plugin's fallback mocks take over, exactly like browser-only mobile dev.
 */
import { BridgeClient, IframeClientAdapter } from '@webview-ts/core';
import type { MergePluginActions, MergePluginEvents } from '@webview-ts/shared';
import { mergeFallbacks } from '@webview-ts/shared';

import { shell } from './plugins';

type Actions = MergePluginActions<[typeof shell]>;
type Events = MergePluginEvents<[typeof shell]>;

const name = new URLSearchParams(location.search).get('name') ?? 'standalone';

// The shell's origin — the ONE trust anchor of this frame.
// Same-origin demo: location.origin works. Cross-origin embedding: replace
// with the shell's real origin (e.g. 'https://shell.example.com'), or every
// message will be silently rejected by the origin checks.
const SHELL_ORIGIN = location.origin;

const bridge = new BridgeClient<Actions, Events>({
  name,
  adapter: new IframeClientAdapter(SHELL_ORIGIN),
  fallback: mergeFallbacks([shell], undefined),
});
bridge.applyPlugins([shell]);
bridge.connect();

const $ = (id: string) => document.getElementById(id)!;
$('title').textContent = name;
$('mode').textContent = bridge.connectionMode;
$('mode').className = `badge ${bridge.connectionMode}`;

function log(line: string) {
  const time = new Date().toLocaleTimeString();
  $('log').textContent = `[${time}] ${line}\n` + $('log').textContent;
}

// ── Calls to the shell ──
$('who').addEventListener('click', async () => {
  const user = await bridge.call('shell.getUser');
  //    ^? { name: string; role: string } — inferred from the contract
  $('user').textContent = `${user.name} (${user.role})`;
  log(`getUser → ${user.name}`);
});

$('toast').addEventListener('click', async () => {
  const result = await bridge.call('shell.showToast', { message: `hello from ${name}` });
  log(`showToast → shown: ${result.shown}`);
});

// ── Events from the shell ──
bridge.on('shell.themeChanged', ({ theme }) => {
  document.documentElement.dataset.theme = theme;
  log(`themeChanged → ${theme}`);
});

bridge.on('shell.ping', ({ from }) => {
  log(`ping from ${from} — this frame was targeted`);
});

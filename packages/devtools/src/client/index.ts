/**
 * DevTools client runtime — importing this module registers the auto-connect
 * recorder with the bridge engine (via the seam in @webview-ts/shared).
 *
 * Usage (once, in your dev entry):
 *   if (import.meta.env.DEV) import('@webview-ts/devtools/client');
 */
import { registerDevToolsConnector } from '@webview-ts/shared';

import { tryAutoDevTools } from './auto-connect';

registerDevToolsConnector(tryAutoDevTools);

export { tryAutoDevTools } from './auto-connect';

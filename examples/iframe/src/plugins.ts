/**
 * The contract between the shell (parent page) and the embedded frames
 * (iframes). Same definePlugin as the native examples — the transport
 * underneath is just different.
 */
import { action, definePlugin, event } from '@webview-ts/shared';

export interface ShellUser {
  name: string;
  role: string;
}

export const shell = definePlugin(
  'shell',
  {
    /** Ask the shell who is logged in */
    getUser: action<void, ShellUser>(),
    /** Ask the shell to show a toast in shell chrome */
    showToast: action<{ message: string }, { shown: boolean }>(),
  },
  {
    events: {
      /** Shell pushes theme changes to embedded frames */
      themeChanged: event<{ theme: 'light' | 'dark' }>(),
      /** Shell pings a single frame (targeted routing demo) */
      ping: event<{ from: string }>(),
    },
  }
).withFallback({
  // Opened standalone (child.html directly, no parent shell) → mock mode
  getUser: async () => ({ name: 'Standalone Guest', role: 'no-shell' }),
  showToast: async ({ message }) => {
    console.log('[fallback toast]', message);
    return { shown: false };
  },
});

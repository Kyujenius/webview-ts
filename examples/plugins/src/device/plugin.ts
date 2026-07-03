import { action, definePlugin, event } from '@webview-ts/shared';

import type { AppStateStatus, DeviceInfoResponse } from './types';

export const device = definePlugin(
  'device',
  {
    getInfo: action<void, DeviceInfoResponse>({ cache: true }),
  },
  {
    events: {
      appStateChanged: event<AppStateStatus>(),
    },
  }
).withFallback({
  getInfo: async () => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

    const OS_MAP: [string[], string][] = [
      [['Windows'], 'Windows'],
      [['Mac'], 'macOS'],
      [['Linux'], 'Linux'],
      [['Android'], 'Android'],
      [['iPhone', 'iPad'], 'iOS'],
    ];

    const osName =
      OS_MAP.find(([keywords]) => keywords.some((k) => ua.includes(k)))?.[1] ?? 'Unknown';

    return {
      name: 'Web Browser',
      brand: null,
      model: null,
      osName,
      osVersion: '',
    };
  },
});

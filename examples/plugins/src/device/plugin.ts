import { definePlugin, action } from '@webview-ts/shared';
import type { DeviceInfoResponse } from './types';

export const device = definePlugin('device', {
  getInfo: action<void, DeviceInfoResponse>(),
}).withFallback({
  getInfo: async () => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    let osName = 'Unknown';

    if (ua.includes('Windows')) osName = 'Windows';
    else if (ua.includes('Mac')) osName = 'macOS';
    else if (ua.includes('Linux')) osName = 'Linux';
    else if (ua.includes('Android')) osName = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) osName = 'iOS';

    return {
      name: 'Web Browser',
      brand: null,
      model: null,
      osName,
      osVersion: '',
    };
  },
});

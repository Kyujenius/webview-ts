import type { FallbackMap } from '@webview-ts/shared';
import { DeviceActions } from './plugin';

export const deviceFallback: FallbackMap = {
  [DeviceActions.getInfo]: async () => {
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
};

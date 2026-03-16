import { definePlugin, action } from '@webview-ts/shared';
import type { DeviceInfoResponse } from './types';

export const device = definePlugin('device', {
  getInfo: action<void, DeviceInfoResponse>(),
});

export const DeviceActions = device.actions;

import { definePlugin, action } from '@webview-ts/shared';
import type { ImpactPayload, NotificationPayload } from './types';

export const haptics = definePlugin('haptics', {
  impact: action<ImpactPayload, Record<string, never>>(),
  notification: action<NotificationPayload, Record<string, never>>(),
  selection: action<void, Record<string, never>>(),
});

export const HapticsActions = haptics.actions;

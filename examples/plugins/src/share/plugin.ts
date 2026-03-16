import { definePlugin, action } from '@webview-ts/shared';
import type { SharePayload, ShareResponse } from './types';

export const share = definePlugin('share', {
  share: action<SharePayload, ShareResponse>(),
});

export const ShareActions = share.actions;

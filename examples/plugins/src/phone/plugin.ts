import { definePlugin, action } from '@webview-ts/shared';
import type { CallPayload, CallResponse } from './types';

export const phone = definePlugin('phone', {
  call: action<CallPayload, CallResponse>(),
});

export const PhoneActions = phone.actions;

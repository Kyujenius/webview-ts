/**
 * Pure TypeScript type guards for runtime validation of bridge messages.
 * Zero dependencies — no Zod, no schema library.
 */

import type { BridgeEvent, BridgeMessage, BridgeResponse } from '../types/message';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Type guard for BridgeMessage
 */
export function isBridgeMessage(value: unknown): value is BridgeMessage {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.action === 'string' &&
    typeof value.timestamp === 'number'
  );
}

/**
 * Type guard for BridgeResponse
 */
export function isBridgeResponse(value: unknown): value is BridgeResponse {
  if (!isObject(value)) return false;
  if (typeof value.id !== 'string' || typeof value.timestamp !== 'number') return false;
  if (value.success === true) {
    return 'data' in value;
  }
  if (value.success === false) {
    return (
      isObject(value.error) &&
      typeof value.error.code === 'string' &&
      typeof value.error.message === 'string'
    );
  }
  return false;
}

/**
 * Type guard for BridgeEvent
 */
export function isBridgeEvent(value: unknown): value is BridgeEvent {
  return (
    isObject(value) &&
    typeof value.event === 'string' &&
    'payload' in value &&
    typeof value.timestamp === 'number'
  );
}

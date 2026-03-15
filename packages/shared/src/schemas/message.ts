/**
 * Pure TypeScript type guards for runtime validation of bridge messages.
 * Zero dependencies — no Zod, no schema library.
 */

import type { BridgeMessage, BridgeResponse, BridgeEvent } from '../types/message';

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
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.success === 'boolean' &&
    typeof value.timestamp === 'number'
  );
}

/**
 * Type guard for BridgeEvent
 */
export function isBridgeEvent(value: unknown): value is BridgeEvent {
  return isObject(value) && typeof value.event === 'string' && typeof value.timestamp === 'number';
}

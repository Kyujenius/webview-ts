import type { BridgeResponse } from './message';

/**
 * Call lifecycle events — emitted by BridgeClient (web side) and
 * BridgeHost (native side) around every bridge call.
 * Subscribe via `onCall('call:start' | 'call:end' | 'call:error')`
 * for logging, timing, and telemetry.
 */

export interface CallStartEvent {
  id: string;
  action: string;
  payload: unknown;
  timestamp: number;
}

export interface CallEndEvent {
  id: string;
  action: string;
  response: BridgeResponse;
  duration: number;
}

export interface CallErrorEvent {
  id: string;
  action: string;
  error: Error;
  duration: number;
}

export type CallEventMap = {
  'call:start': CallStartEvent;
  'call:end': CallEndEvent;
  'call:error': CallErrorEvent;
};

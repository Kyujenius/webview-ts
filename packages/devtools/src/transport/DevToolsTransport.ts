import type { RecordedMessage, PerformanceMetrics } from '../types/index';

export type TransportMessage =
  | { type: 'record'; record: RecordedMessage }
  | { type: 'clear' }
  | { type: 'metrics'; metrics: PerformanceMetrics };

export interface DevToolsTransport {
  send(data: TransportMessage): void;
  onMessage(handler: (data: TransportMessage) => void): void;
  onDisconnect(handler: () => void): void;
  readonly connected: boolean;
  disconnect(): void;
}

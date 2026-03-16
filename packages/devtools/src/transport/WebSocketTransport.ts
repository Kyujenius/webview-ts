import type { DevToolsTransport, TransportMessage } from './DevToolsTransport';

export interface WebSocketTransportConfig {
  host?: string;
  port?: number;
}

export class WebSocketTransport implements DevToolsTransport {
  private ws: WebSocket;
  private handlers: Array<(data: TransportMessage) => void> = [];
  private disconnectHandlers: Array<() => void> = [];

  constructor(config: WebSocketTransportConfig = {}) {
    const host = config.host ?? 'localhost';
    const port = config.port ?? 4000;
    this.ws = new WebSocket(`ws://${host}:${port}`);

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as TransportMessage;
        for (const h of this.handlers) h(data);
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      for (const h of this.disconnectHandlers) h();
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror
    };
  }

  send(data: TransportMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  onMessage(handler: (data: TransportMessage) => void): void {
    this.handlers.push(handler);
  }

  onDisconnect(handler: () => void): void {
    this.disconnectHandlers.push(handler);
  }

  get connected(): boolean {
    return this.ws.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    this.ws.close();
    this.handlers = [];
  }
}

import type { DevToolsTransport, TransportMessage } from './DevToolsTransport';

export interface WebSocketTransportConfig {
  host?: string;
  port?: number;
  reconnectInterval?: number;
}

export class WebSocketTransport implements DevToolsTransport {
  private ws: WebSocket | null = null;
  private handlers: Array<(data: TransportMessage) => void> = [];
  private disconnectHandlers: Array<() => void> = [];
  private url: string;
  private reconnectInterval: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private isConnected = false;

  constructor(config: WebSocketTransportConfig = {}) {
    const host = config.host ?? 'localhost';
    const port = config.port ?? 4000;
    this.url = `ws://${host}:${port}`;
    this.reconnectInterval = config.reconnectInterval ?? 3000;
    this.connect();
  }

  private connect(): void {
    if (this.disposed) return;

    const ws = new WebSocket(this.url);

    ws.onopen = () => {
      this.ws = ws;
      this.isConnected = true;
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as TransportMessage;
        for (const h of this.handlers) h(data);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      const wasConnected = this.isConnected;
      this.isConnected = false;
      this.ws = null;
      if (wasConnected) {
        for (const h of this.disconnectHandlers) h();
      }
      if (!this.disposed) {
        this.timer = setTimeout(() => this.connect(), this.reconnectInterval);
      }
    };

    ws.onerror = () => {
      // onclose will fire after onerror
    };
  }

  send(data: TransportMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
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
    return this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.ws?.close();
    this.ws = null;
    this.handlers = [];
    this.disconnectHandlers = [];
  }
}

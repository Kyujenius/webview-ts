import type { DevToolsTransport, TransportMessage } from './DevToolsTransport';

const CHANNEL_NAME = '__ts-bridge-devtools__';

export class BroadcastChannelTransport implements DevToolsTransport {
  private channel: BroadcastChannel;
  private handlers: Array<(data: TransportMessage) => void> = [];
  private disconnectHandlers: Array<() => void> = [];
  private disposed = false;

  constructor(channelName: string = CHANNEL_NAME) {
    this.channel = new BroadcastChannel(channelName);
    this.channel.onmessage = (event: MessageEvent) => {
      for (const h of this.handlers) {
        h(event.data as TransportMessage);
      }
    };
  }

  send(data: TransportMessage): void {
    this.channel.postMessage(data);
  }

  onMessage(handler: (data: TransportMessage) => void): void {
    this.handlers.push(handler);
  }

  onDisconnect(handler: () => void): void {
    this.disconnectHandlers.push(handler);
  }

  get connected(): boolean {
    return !this.disposed;
  }

  disconnect(): void {
    this.disposed = true;
    this.channel.close();
    this.handlers = [];
    for (const h of this.disconnectHandlers) h();
    this.disconnectHandlers = [];
  }
}

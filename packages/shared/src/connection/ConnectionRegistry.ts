export type SendFn = (message: string) => void;

export interface ConnectionEntry {
  sourceId: string;
  send: SendFn;
}

export class ConnectionRegistry {
  private connections = new Map<string, ConnectionEntry>();

  register(sourceId: string, sender: SendFn): void {
    this.connections.set(sourceId, { sourceId, send: sender });
  }

  unregister(sourceId: string): void {
    this.connections.delete(sourceId);
  }

  get(sourceId: string): ConnectionEntry | undefined {
    return this.connections.get(sourceId);
  }

  getAll(): ConnectionEntry[] {
    return [...this.connections.values()];
  }

  sendTo(targetId: string, message: string): void {
    const entry = this.connections.get(targetId);
    if (!entry) {
      throw new Error(`[webview-ts] No connection found for targetId: ${targetId}`);
    }
    entry.send(message);
  }

  broadcast(message: string, excludeSourceId?: string): void {
    for (const entry of this.connections.values()) {
      if (entry.sourceId !== excludeSourceId) {
        entry.send(message);
      }
    }
  }
}

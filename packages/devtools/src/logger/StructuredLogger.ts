/**
 * StructuredLogger - Structured logging for bridge messages (onion model)
 */

import type { Middleware, MiddlewareFn } from '@ts-bridge/shared';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  level: LogLevel;
  timestamp: number;
  message: string;
  data?: unknown;
  error?: {
    message: string;
    stack?: string;
  };
}

export interface LoggerConfig {
  /** Minimum log level to record @default LogLevel.INFO */
  minLevel?: LogLevel;
  /** Log to console @default false */
  console?: boolean;
  /** Custom log handler */
  onLog?: (entry: LogEntry) => void;
  /** Include request/response payloads @default true */
  includePayloads?: boolean;
}

export class StructuredLogger {
  private config: Required<LoggerConfig>;
  private logs: LogEntry[];

  constructor(config: LoggerConfig = {}) {
    this.config = {
      minLevel: config.minLevel ?? LogLevel.INFO,
      console: config.console ?? false,
      onLog: config.onLog ?? (() => {}),
      includePayloads: config.includePayloads ?? true,
    };
    this.logs = [];
  }

  get name(): string {
    return 'structured-logger';
  }

  get fn(): MiddlewareFn {
    return this.createFn();
  }

  toMiddleware(): Middleware {
    return { name: this.name, fn: this.createFn() };
  }

  private createFn(): MiddlewareFn {
    return async (ctx, next) => {
      const message = ctx.request;

      // Request phase
      this.log(LogLevel.DEBUG, `Request: ${message.action}`, {
        id: message.id,
        action: message.action,
        payload: this.config.includePayloads ? message.payload : '[hidden]',
      });

      try {
        await next();

        // Response phase
        if (ctx.response) {
          if (ctx.response.success) {
            this.log(LogLevel.DEBUG, `Response: ${message.action} (success)`, {
              id: ctx.response.id,
              data: this.config.includePayloads ? ctx.response.data : '[hidden]',
            });
          } else {
            this.log(LogLevel.ERROR, `Response: ${message.action} (error)`, {
              id: ctx.response.id,
              error: ctx.response.error,
            });
          }
        }
      } catch (error) {
        this.log(
          LogLevel.ERROR,
          `Request failed: ${message.action}`,
          { id: message.id, action: message.action },
          error as Error,
        );
        throw error;
      }
    };
  }

  log(level: LogLevel, message: string, data?: unknown, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      timestamp: Date.now(),
      message,
      data,
      error: error
        ? { message: error.message, stack: error.stack }
        : undefined,
    };

    this.logs.push(entry);

    if (this.config.console) {
      this.logToConsole(entry);
    }

    this.config.onLog(entry);
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.config.minLevel);
  }

  private logToConsole(entry: LogEntry): void {
    const prefix = `[${new Date(entry.timestamp).toISOString()}] [${entry.level.toUpperCase()}]`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.data);
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data);
        break;
      case LogLevel.ERROR:
        console.error(prefix, entry.message, entry.data, entry.error);
        break;
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter((e) => e.level === level);
  }

  clear(): void {
    this.logs = [];
  }

  export(): string {
    return JSON.stringify(
      { version: '1.0', timestamp: Date.now(), logs: this.logs },
      null,
      2,
    );
  }
}

export function createStructuredLogger(config?: LoggerConfig): StructuredLogger {
  return new StructuredLogger(config);
}

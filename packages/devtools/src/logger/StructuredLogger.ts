/**
 * StructuredLogger - Structured logging for bridge messages
 */

import type { Middleware, MiddlewareContext } from '@ts-bridge/shared';

/**
 * Log level
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Log entry
 */
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

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /**
   * Minimum log level to record
   * @default LogLevel.INFO
   */
  minLevel?: LogLevel;

  /**
   * Log to console
   * @default false
   */
  console?: boolean;

  /**
   * Custom log handler
   */
  onLog?: (entry: LogEntry) => void;

  /**
   * Include request/response payloads
   * @default true
   */
  includePayloads?: boolean;
}

/**
 * Structured logger middleware
 */
export class StructuredLogger implements Middleware {
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

  /**
   * Middleware name
   */
  get name(): string {
    return 'structured-logger';
  }

  /**
   * Log request
   */
  async onRequest(context: MiddlewareContext): Promise<void> {
    const message = context.request;

    this.log(LogLevel.DEBUG, `Request: ${message.action}`, {
      id: message.id,
      action: message.action,
      payload: this.config.includePayloads ? message.payload : '[hidden]',
    });
  }

  /**
   * Log response
   */
  async onResponse(context: MiddlewareContext): Promise<void> {
    const message = context.request;
    const response = context.response;

    if (!response) {
      return;
    }

    if (response.success) {
      this.log(LogLevel.DEBUG, `Response: ${message.action} (success)`, {
        id: response.id,
        data: this.config.includePayloads ? response.data : '[hidden]',
      });
    } else {
      this.log(LogLevel.ERROR, `Response: ${message.action} (error)`, {
        id: response.id,
        error: response.error,
      });
    }
  }

  /**
   * Log error
   */
  async onError(context: MiddlewareContext, error: Error): Promise<void> {
    const message = context.request;

    this.log(
      LogLevel.ERROR,
      `Request failed: ${message.action}`,
      {
        id: message.id,
        action: message.action,
      },
      error
    );
  }

  /**
   * Log a message
   */
  log(level: LogLevel, message: string, data?: unknown, error?: Error): void {
    // Check level
    if (!this.shouldLog(level)) {
      return;
    }

    // Create entry
    const entry: LogEntry = {
      level,
      timestamp: Date.now(),
      message,
      data,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    };

    // Store entry
    this.logs.push(entry);

    // Console output
    if (this.config.console) {
      this.logToConsole(entry);
    }

    // Custom handler
    this.config.onLog(entry);
  }

  /**
   * Check if level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const minIndex = levels.indexOf(this.config.minLevel);
    const levelIndex = levels.indexOf(level);
    return levelIndex >= minIndex;
  }

  /**
   * Log to console
   */
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

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter((entry) => entry.level === level);
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  export(): string {
    return JSON.stringify(
      {
        version: '1.0',
        timestamp: Date.now(),
        logs: this.logs,
      },
      null,
      2
    );
  }
}

/**
 * Create structured logger
 */
export function createStructuredLogger(config?: LoggerConfig): StructuredLogger {
  return new StructuredLogger(config);
}

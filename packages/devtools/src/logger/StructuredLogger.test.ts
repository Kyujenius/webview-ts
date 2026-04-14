import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LogLevel, StructuredLogger } from './StructuredLogger';

describe('StructuredLogger', () => {
  let logger: StructuredLogger;

  beforeEach(() => {
    logger = new StructuredLogger();
  });

  describe('log()', () => {
    it('stores entries with level, timestamp, message, and data', () => {
      logger.log(LogLevel.INFO, 'hello', { key: 'val' });
      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.INFO);
      expect(logs[0].message).toBe('hello');
      expect(logs[0].data).toEqual({ key: 'val' });
      expect(typeof logs[0].timestamp).toBe('number');
    });

    it('filters out DEBUG when minLevel is INFO (default)', () => {
      logger.log(LogLevel.DEBUG, 'debug msg');
      expect(logger.getLogs()).toHaveLength(0);
    });

    it('records DEBUG when minLevel is DEBUG', () => {
      const l = new StructuredLogger({ minLevel: LogLevel.DEBUG });
      l.log(LogLevel.DEBUG, 'debug msg');
      expect(l.getLogs()).toHaveLength(1);
    });

    it('calls onLog callback with the entry', () => {
      const onLog = vi.fn();
      const l = new StructuredLogger({ onLog });
      l.log(LogLevel.INFO, 'cb test');
      expect(onLog).toHaveBeenCalledOnce();
      expect(onLog.mock.calls[0][0].message).toBe('cb test');
    });

    it('calls console.debug/info/warn/error when console: true', () => {
      const spies = {
        debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
        info: vi.spyOn(console, 'info').mockImplementation(() => {}),
        warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
        error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      };

      const l = new StructuredLogger({ console: true, minLevel: LogLevel.DEBUG });
      l.log(LogLevel.DEBUG, 'dbg');
      l.log(LogLevel.INFO, 'inf');
      l.log(LogLevel.WARN, 'wrn');
      l.log(LogLevel.ERROR, 'err');

      expect(spies.debug).toHaveBeenCalledOnce();
      expect(spies.info).toHaveBeenCalledOnce();
      expect(spies.warn).toHaveBeenCalledOnce();
      expect(spies.error).toHaveBeenCalledOnce();

      vi.restoreAllMocks();
    });

    it('records error.message and error.stack from an Error object', () => {
      const err = new Error('boom');
      logger.log(LogLevel.ERROR, 'failed', undefined, err);
      const entry = logger.getLogs()[0];
      expect(entry.error?.message).toBe('boom');
      expect(entry.error?.stack).toBeDefined();
    });
  });

  describe('getLogs()', () => {
    it('returns a copy of the logs array', () => {
      logger.log(LogLevel.INFO, 'a');
      const copy = logger.getLogs();
      copy.push({ level: LogLevel.WARN, timestamp: 0, message: 'injected' });
      expect(logger.getLogs()).toHaveLength(1);
    });
  });

  describe('getLogsByLevel()', () => {
    it('filters entries by the given level', () => {
      logger.log(LogLevel.INFO, 'info msg');
      logger.log(LogLevel.WARN, 'warn msg');
      logger.log(LogLevel.ERROR, 'error msg');

      const warns = logger.getLogsByLevel(LogLevel.WARN);
      expect(warns).toHaveLength(1);
      expect(warns[0].message).toBe('warn msg');
    });
  });

  describe('clear()', () => {
    it('empties the logs array', () => {
      logger.log(LogLevel.INFO, 'x');
      logger.clear();
      expect(logger.getLogs()).toHaveLength(0);
    });
  });

  describe('export()', () => {
    it('returns a JSON string with version and logs', () => {
      logger.log(LogLevel.INFO, 'exported');
      const raw = logger.export();
      const parsed = JSON.parse(raw);
      expect(parsed.version).toBe('1.0');
      expect(parsed.logs).toHaveLength(1);
    });
  });

  describe('toRequestInterceptor()', () => {
    it('returns interceptor with the correct name', () => {
      const interceptor = logger.toRequestInterceptor();
      expect(interceptor.name).toBe('structured-logger');
    });

    it('logs request at DEBUG level', () => {
      const debugLogger = new StructuredLogger({ minLevel: LogLevel.DEBUG });
      const interceptor = debugLogger.toRequestInterceptor();
      const request = {
        id: 'msg-1',
        action: 'test.action',
        payload: { foo: 1 },
        timestamp: Date.now(),
        sourceId: 'src',
        targetId: 'host',
      };

      interceptor.fn(request);

      const debugLogs = debugLogger.getLogsByLevel(LogLevel.DEBUG);
      expect(debugLogs.length).toBeGreaterThanOrEqual(1);
      expect(debugLogs[0].message).toContain('Request:');
      expect(debugLogs[0].message).toContain('test.action');
    });

    it('hides payloads when includePayloads: false', () => {
      const l = new StructuredLogger({ minLevel: LogLevel.DEBUG, includePayloads: false });
      const interceptor = l.toRequestInterceptor();
      const request = {
        id: 'msg-1',
        action: 'test.action',
        payload: { secret: 'hidden' },
        timestamp: Date.now(),
        sourceId: 'src',
        targetId: 'host',
      };

      interceptor.fn(request);

      const debugLogs = l.getLogsByLevel(LogLevel.DEBUG);
      const reqLog = debugLogs.find((e) => e.message.includes('Request:'));
      expect((reqLog?.data as any)?.payload).toBe('[hidden]');
    });
  });

  describe('toResponseInterceptor()', () => {
    it('returns interceptor with the correct name', () => {
      const interceptor = logger.toResponseInterceptor();
      expect(interceptor.name).toBe('structured-logger');
    });

    it('logs success response at DEBUG level', () => {
      const debugLogger = new StructuredLogger({ minLevel: LogLevel.DEBUG });
      const interceptor = debugLogger.toResponseInterceptor();

      interceptor.fn({
        id: 'msg-1',
        success: true,
        data: { result: 'ok' },
        timestamp: Date.now(),
        sourceId: 'host',
        targetId: 'src',
      });

      const debugLogs = debugLogger.getLogsByLevel(LogLevel.DEBUG);
      const responseLogs = debugLogs.filter((e) => e.message.includes('Response:'));
      expect(responseLogs).toHaveLength(1);
      expect(responseLogs[0].message).toContain('success');
    });

    it('logs error response at ERROR level', () => {
      const debugLogger = new StructuredLogger({ minLevel: LogLevel.DEBUG });
      const interceptor = debugLogger.toResponseInterceptor();

      interceptor.fn({
        id: 'msg-1',
        success: false,
        error: { code: 'HANDLER_ERROR', message: 'oops' },
        timestamp: Date.now(),
        sourceId: 'host',
        targetId: 'src',
      });

      const errorLogs = debugLogger.getLogsByLevel(LogLevel.ERROR);
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].message).toContain('error');
    });

    it('hides payloads when includePayloads: false', () => {
      const l = new StructuredLogger({ minLevel: LogLevel.DEBUG, includePayloads: false });
      const interceptor = l.toResponseInterceptor();

      interceptor.fn({
        id: 'msg-1',
        success: true,
        data: { secret: 'hidden' },
        timestamp: Date.now(),
        sourceId: 'host',
        targetId: 'src',
      });

      const debugLogs = l.getLogsByLevel(LogLevel.DEBUG);
      const resLog = debugLogs.find((e) => e.message.includes('Response:'));
      expect((resLog?.data as any)?.data).toBe('[hidden]');
    });
  });
});

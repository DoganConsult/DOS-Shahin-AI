export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp?: string;
  meta?: Record<string, unknown>;
}

export type LogMeta = Record<string, unknown> | string | Error | unknown;

// The PlatformLogger contract accepts EITHER `(msg, meta)` simple-style OR
// `(obj, msg)` pino-style. We express this with a single signature that
// tolerates either shape via `unknown` in the first arg; runtime normalizes
// via normMeta below.
export interface PlatformLogger {
  info(messageOrObj: string | Record<string, unknown> | unknown, meta?: LogMeta): void;
  warn(messageOrObj: string | Record<string, unknown> | unknown, meta?: LogMeta): void;
  error(messageOrObj: string | Record<string, unknown> | unknown, meta?: LogMeta): void;
  debug(messageOrObj: string | Record<string, unknown> | unknown, meta?: LogMeta): void;
  fatal(messageOrObj: string | Record<string, unknown> | unknown, meta?: LogMeta): void;
  child?: (defaultMeta: Record<string, unknown>) => PlatformLogger;
}

let _logger: PlatformLogger | null = null;
let _defaultPino: PlatformLogger | null = null;

function createDefaultPinoLogger(): PlatformLogger {
  if (_defaultPino) return _defaultPino;
  try {
    const pino = require('pino');
    const p = pino({
      level: process.env.LOG_LEVEL || 'info',
      name: process.env.SERVICE_CODE || 'dos-platform',
      formatters: {
        level: (label: string) => ({ level: label }),
      },
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
    });
    _pinoRaw = p;
    _defaultPino = {
      info: (msg: string, meta?: LogMeta) => p.info(normMeta(meta), msg),
      warn: (msg: string, meta?: LogMeta) => p.warn(normMeta(meta), msg),
      error: (msg: string, meta?: LogMeta) => p.error(normMeta(meta), msg),
      debug: (msg: string, meta?: LogMeta) => p.debug(normMeta(meta), msg),
      fatal: (msg: string, meta?: LogMeta) => p.fatal(normMeta(meta), msg),
      child: (defaultMeta: Record<string, unknown>) => {
        const child = p.child(defaultMeta);
        return {
          info: (msg: string, meta?: LogMeta) => child.info(normMeta(meta), msg),
          warn: (msg: string, meta?: LogMeta) => child.warn(normMeta(meta), msg),
          error: (msg: string, meta?: LogMeta) => child.error(normMeta(meta), msg),
          debug: (msg: string, meta?: LogMeta) => child.debug(normMeta(meta), msg),
          fatal: (msg: string, meta?: LogMeta) => child.fatal(normMeta(meta), msg),
          child: (m: Record<string, unknown>) => {
            const c2 = child.child(m);
            return { info: (msg: string, meta?: LogMeta) => c2.info(normMeta(meta), msg), warn: (msg: string, meta?: LogMeta) => c2.warn(normMeta(meta), msg), error: (msg: string, meta?: LogMeta) => c2.error(normMeta(meta), msg), debug: (msg: string, meta?: LogMeta) => c2.debug(normMeta(meta), msg), fatal: (msg: string, meta?: LogMeta) => c2.fatal(normMeta(meta), msg) } as PlatformLogger;
          },
        };
      },
    };
    return _defaultPino;
  } catch {
    return {
      info: (msg, meta) => console.log(JSON.stringify({ level: 'info', msg, ...normMeta(meta), time: new Date().toISOString() })),
      warn: (msg, meta) => console.warn(JSON.stringify({ level: 'warn', msg, ...normMeta(meta), time: new Date().toISOString() })),
      error: (msg, meta) => console.error(JSON.stringify({ level: 'error', msg, ...normMeta(meta), time: new Date().toISOString() })),
      debug: (msg, meta) => console.debug(JSON.stringify({ level: 'debug', msg, ...normMeta(meta), time: new Date().toISOString() })),
      fatal: (msg, meta) => console.error(JSON.stringify({ level: 'fatal', msg, ...normMeta(meta), time: new Date().toISOString() })),
      child: () => createDefaultPinoLogger(),
    };
  }
}

function normMeta(meta?: LogMeta): Record<string, unknown> {
  const { redactPii, redactPiiInObject } = require('./pii-redact');
  if (!meta) return {};
  if (typeof meta === 'string') return { message: redactPii(meta) };
  if (meta instanceof Error) return { err: { message: redactPii(meta.message), stack: meta.stack, name: meta.name } };
  if (typeof meta === 'object') return redactPiiInObject(meta as Record<string, unknown>);
  return { value: redactPii(String(meta)) };
}

// Raw pino reference for runtime level changes
let _pinoRaw: any = null;

export function setLogger(l: PlatformLogger): void {
  _logger = l;
}

/** Change log level at runtime without restart. */
export function setLogLevel(level: LogLevel): void {
  if (_pinoRaw) {
    _pinoRaw.level = level;
  }
  // Also update env so child processes inherit the new level
  process.env.LOG_LEVEL = level;
}

/** Get the current effective log level. */
export function getLogLevel(): LogLevel {
  if (_pinoRaw) return _pinoRaw.level as LogLevel;
  return (process.env.LOG_LEVEL || 'info') as LogLevel;
}

function getLogger(): PlatformLogger {
  return _logger || createDefaultPinoLogger();
}

export const logger: PlatformLogger = {
  info: (msg, meta) => getLogger().info(msg, meta),
  warn: (msg, meta) => getLogger().warn(msg, meta),
  error: (msg, meta) => getLogger().error(msg, meta),
  debug: (msg, meta) => getLogger().debug(msg, meta),
  fatal: (msg, meta) => getLogger().fatal(msg, meta),
  child: (meta) => getLogger().child ? getLogger().child!(meta) : getLogger(),
};

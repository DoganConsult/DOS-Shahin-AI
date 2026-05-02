export interface PlatformLogger {
  debug(messageOrObj: string | Record<string, unknown> | unknown, meta?: unknown): void;
  info(messageOrObj: string | Record<string, unknown> | unknown, meta?: unknown): void;
  warn(messageOrObj: string | Record<string, unknown> | unknown, meta?: unknown): void;
  error(messageOrObj: string | Record<string, unknown> | unknown, meta?: unknown): void;
}

export type Logger = PlatformLogger;

const consoleFallback: PlatformLogger = {
  debug: (msg: any, meta?: any) => console.debug(msg, meta),
  info: (msg: any, meta?: any) => console.info(msg, meta),
  warn: (msg: any, meta?: any) => console.warn(msg, meta),
  error: (msg: any, meta?: any) => console.error(msg, meta),
};

const GLOBAL_LOGGER_KEY = Symbol.for('__dos_sdk_logger__');

if (!(globalThis as any)[GLOBAL_LOGGER_KEY]) {
  (globalThis as any)[GLOBAL_LOGGER_KEY] = consoleFallback;
}

export function setLogger(l: PlatformLogger): void {
  (globalThis as any)[GLOBAL_LOGGER_KEY] = l;
}

export const logger: PlatformLogger = {
  debug: (msg: any, meta?: any) => ((globalThis as any)[GLOBAL_LOGGER_KEY] as any).debug(msg, meta),
  info: (msg: any, meta?: any) => ((globalThis as any)[GLOBAL_LOGGER_KEY] as any).info(msg, meta),
  warn: (msg: any, meta?: any) => ((globalThis as any)[GLOBAL_LOGGER_KEY] as any).warn(msg, meta),
  error: (msg: any, meta?: any) => ((globalThis as any)[GLOBAL_LOGGER_KEY] as any).error(msg, meta),
};

export function getLogger(): PlatformLogger {
  return (globalThis as any)[GLOBAL_LOGGER_KEY] as PlatformLogger;
}

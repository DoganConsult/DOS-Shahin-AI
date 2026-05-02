export interface PlatformLogger {
  debug(msg: string, meta?: unknown): void;
  info(msg: string, meta?: unknown): void;
  warn(msg: string, meta?: unknown): void;
  error(msg: string, meta?: unknown): void;
}

export type Logger = PlatformLogger;

const consoleFallback: PlatformLogger = {
  debug: (msg, meta) => console.debug(msg, meta),
  info: (msg, meta) => console.info(msg, meta),
  warn: (msg, meta) => console.warn(msg, meta),
  error: (msg, meta) => console.error(msg, meta),
};

let _logger: PlatformLogger = consoleFallback;

export function setLogger(l: PlatformLogger): void {
  _logger = l;
}

export const logger: PlatformLogger = {
  debug: (msg, meta) => _logger.debug(msg, meta),
  info: (msg, meta) => _logger.info(msg, meta),
  warn: (msg, meta) => _logger.warn(msg, meta),
  error: (msg, meta) => _logger.error(msg, meta),
};

export function getLogger(): PlatformLogger {
  return _logger;
}

/**
 * Logger port — outbound interface for structured logging.
 * Default: thin console adapter so the module is self-sufficient. Host can
 * override with platform observability via bindLoggerPort().
 */

export type LogMeta = Record<string, unknown> | string | unknown;

export interface PlatformLogger {
  debug(msg: string, meta?: LogMeta): void;
  info(msg: string, meta?: LogMeta): void;
  warn(msg: string, meta?: LogMeta): void;
  error(msg: string, meta?: LogMeta): void;
}

const consoleLogger: PlatformLogger = {
  /* eslint-disable no-console */
  debug: (m, meta) => console.debug('[foundation]', m, meta ?? ''),
  info: (m, meta) => console.log('[foundation]', m, meta ?? ''),
  warn: (m, meta) => console.warn('[foundation]', m, meta ?? ''),
  error: (m, meta) => console.error('[foundation]', m, meta ?? ''),
};

let _logger: PlatformLogger = consoleLogger;

export function bindLoggerPort(impl: { logger?: PlatformLogger }) {
  if (impl.logger) _logger = impl.logger;
}

export const logger: PlatformLogger = {
  debug: (m, meta) => _logger.debug(m, meta),
  info: (m, meta) => _logger.info(m, meta),
  warn: (m, meta) => _logger.warn(m, meta),
  error: (m, meta) => _logger.error(m, meta),
};

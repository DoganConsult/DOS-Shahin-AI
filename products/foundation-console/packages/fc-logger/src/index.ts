// @fc/logger — pino JSON in prod, single source of truth for service logs.
import pino from 'pino';

export interface FcLoggerOptions {
  service: string;
  level?: string;
  prettyDev?: boolean;
}

export function createLogger(opts: FcLoggerOptions) {
  const isProd = process.env['NODE_ENV'] === 'production';
  const prettyEnv = process.env['FC_LOG_PRETTY'];
  const prettyAllowed = prettyEnv === undefined ? !isProd : prettyEnv === 'true';
  const level = opts.level ?? process.env['FC_LOG_LEVEL'] ?? 'info';
  const base: pino.LoggerOptions = {
    level,
    base: { service: opts.service, productCode: 'foundation-console' },
    timestamp: pino.stdTimeFunctions.isoTime,
  };
  if (prettyAllowed && opts.prettyDev !== false) {
    base.transport = {
      target: 'pino-pretty',
      options: { translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' },
    };
  }
  return pino(base);
}

export type FcLogger = ReturnType<typeof createLogger>;

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
export declare function bindLoggerPort(impl: {
    logger?: PlatformLogger;
}): void;
export declare const logger: PlatformLogger;

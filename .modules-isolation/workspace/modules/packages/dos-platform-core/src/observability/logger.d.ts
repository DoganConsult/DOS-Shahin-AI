export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp?: string;
    meta?: Record<string, unknown>;
}
export type LogMeta = Record<string, unknown> | string | Error | unknown;
export interface PlatformLogger {
    info(messageOrObj: string | Record<string, unknown> | unknown, meta?: LogMeta): void;
    warn(messageOrObj: string | Record<string, unknown> | unknown, meta?: LogMeta): void;
    error(messageOrObj: string | Record<string, unknown> | unknown, meta?: LogMeta): void;
    debug(messageOrObj: string | Record<string, unknown> | unknown, meta?: LogMeta): void;
    fatal(messageOrObj: string | Record<string, unknown> | unknown, meta?: LogMeta): void;
    child?: (defaultMeta: Record<string, unknown>) => PlatformLogger;
}
export declare function setLogger(l: PlatformLogger): void;
/** Change log level at runtime without restart. */
export declare function setLogLevel(level: LogLevel): void;
/** Get the current effective log level. */
export declare function getLogLevel(): LogLevel;
export declare const logger: PlatformLogger;

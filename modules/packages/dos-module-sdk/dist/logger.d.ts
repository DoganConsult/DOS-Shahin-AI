export interface PlatformLogger {
    debug(messageOrObj: string | Record<string, unknown> | unknown, meta?: unknown): void;
    info(messageOrObj: string | Record<string, unknown> | unknown, meta?: unknown): void;
    warn(messageOrObj: string | Record<string, unknown> | unknown, meta?: unknown): void;
    error(messageOrObj: string | Record<string, unknown> | unknown, meta?: unknown): void;
}
export type Logger = PlatformLogger;
export declare function setLogger(l: PlatformLogger): void;
export declare const logger: PlatformLogger;
export declare function getLogger(): PlatformLogger;

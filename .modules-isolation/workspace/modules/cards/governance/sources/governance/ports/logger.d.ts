export interface PlatformLogger {
    debug(msg: string, meta?: unknown): void;
    info(msg: string, meta?: unknown): void;
    warn(msg: string, meta?: unknown): void;
    error(msg: string, meta?: unknown): void;
}
export type Logger = PlatformLogger;
export declare function setLogger(l: PlatformLogger): void;
export declare const logger: PlatformLogger;
export declare function getLogger(): PlatformLogger;

export declare enum ErrorCategory {
    EVENT_BUS = "EVENT_BUS",
    AGENT_ACTION = "AGENT_ACTION",
    DB_CLEANUP = "DB_CLEANUP",
    CACHE_OP = "CACHE_OP",
    FALLBACK_QUERY = "FALLBACK_QUERY"
}
export declare const EC: typeof ErrorCategory;
export interface CatchContext {
    tenantId?: string;
    correlationId?: string;
    agentId?: string;
    operation?: string;
    userId?: string;
}
export interface PlatformResilience {
    swallow(category: ErrorCategory, promise: Promise<unknown>, context?: CatchContext): void;
    swallowNull<T>(category: ErrorCategory, promise: Promise<T>, context?: CatchContext): Promise<T | null>;
    swallowEmpty<T>(category: ErrorCategory, promise: Promise<T[]>, context?: CatchContext): Promise<T[]>;
    swallowDefault<T>(category: ErrorCategory, fallback: T, promise: Promise<T>, context?: CatchContext): Promise<T>;
    swallowSync(category: ErrorCategory, fn: () => void, context?: CatchContext): void;
    catchHandler(category: ErrorCategory, context?: CatchContext): (err: unknown) => void;
}
export declare function setResilienceHandler(impl: PlatformResilience): void;
export declare function swallow(category: ErrorCategory, promise: Promise<unknown>, context?: CatchContext): void;
export declare function swallowNull<T>(category: ErrorCategory, promise: Promise<T>, context?: CatchContext): Promise<T | null>;
export declare function swallowEmpty<T>(category: ErrorCategory, promise: Promise<T[]>, context?: CatchContext): Promise<T[]>;
export declare function swallowDefault<T>(category: ErrorCategory, fallback: T, promise: Promise<T>, context?: CatchContext): Promise<T>;
export declare function swallowSync(category: ErrorCategory, fn: () => void, context?: CatchContext): void;
export declare function catchHandler(category: ErrorCategory, context?: CatchContext): (err: unknown) => void;

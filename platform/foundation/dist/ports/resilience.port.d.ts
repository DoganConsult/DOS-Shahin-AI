/**
 * Resilience port — outbound interface for error/retry handling.
 * Mirrors `@dos/platform-core/resilience` (catchHandler, EC) but bindable.
 */
export declare const EC: {
    readonly EVENT_BUS: "event_bus";
    readonly DB: "database";
    readonly HTTP: "http";
    readonly AI: "ai";
    readonly WORKFLOW: "workflow";
    readonly AUDIT: "audit";
    readonly UNKNOWN: "unknown";
};
export type ErrorCategory = (typeof EC)[keyof typeof EC];
export type CatchHandlerFn = (category: ErrorCategory | string, context?: Record<string, unknown>) => (err: unknown) => void;
export declare function bindResiliencePort(impl: {
    catchHandler?: CatchHandlerFn;
}): void;
export declare const catchHandler: CatchHandlerFn;

import * as Sentry from '@sentry/node';
export interface ErrorTelemetryOptions {
    serviceCode: string;
    /** Override DSN (otherwise read from SENTRY_DSN). */
    dsn?: string;
}
export declare function initErrorTelemetry(opts: ErrorTelemetryOptions): boolean;
export declare function captureException(err: unknown, ctx?: Record<string, unknown>): void;
export declare function captureMessage(msg: string, level?: 'fatal' | 'error' | 'warning' | 'info'): void;
export declare const sentry: typeof Sentry;
//# sourceMappingURL=error-telemetry.d.ts.map
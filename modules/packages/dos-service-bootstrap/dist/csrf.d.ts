import { type DoubleCsrfConfigOptions } from 'csrf-csrf';
export interface CsrfFactoryOptions extends Partial<DoubleCsrfConfigOptions> {
    /** Override secret. Defaults to env CSRF_SECRET, then derived from JWT_SECRET. */
    secret?: string;
    /** Routes (regex/array) exempt from CSRF — typically /health, /metrics. */
    ignoredRoutes?: (string | RegExp)[];
}
export declare function createCsrfMiddleware(opts?: CsrfFactoryOptions): import("csrf-csrf").DoubleCsrfUtilities;
//# sourceMappingURL=csrf.d.ts.map
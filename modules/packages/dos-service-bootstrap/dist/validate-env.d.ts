export interface EnvRule {
    name: string;
    required: boolean;
    secret?: boolean;
    description?: string;
    validator?: (value: string) => boolean;
}
export interface EnvValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
/**
 * Validate critical environment variables at service startup.
 * Returns validation result with errors (missing required) and warnings (missing optional / placeholder values).
 */
export declare function validateCriticalEnv(serviceCode: string, extraRules?: EnvRule[]): EnvValidationResult;
/**
 * Validate environment and log results. If critical vars are missing in production, refuse to boot.
 */
export declare function enforceEnvValidation(serviceCode: string, logger: {
    info: (msg: string, meta?: unknown) => void;
    warn: (msg: string, meta?: unknown) => void;
    error: (msg: string, meta?: unknown) => void;
}, extraRules?: EnvRule[]): void;
//# sourceMappingURL=validate-env.d.ts.map
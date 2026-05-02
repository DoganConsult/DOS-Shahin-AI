import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import { type EnvRule } from './validate-env';
export interface ServiceConfig {
    serviceCode: string;
    port: number;
    cors?: cors.CorsOptions;
    helmet?: Parameters<typeof helmet>[0];
    modules?: ModuleRegistration[];
    routes?: RouteRegistration[];
    healthChecks?: Record<string, () => Promise<boolean>>;
    onReady?: () => void;
    skipDbPool?: boolean;
    migrationsDir?: string;
    skipMigrations?: boolean;
    rateLimiting?: {
        enabled?: boolean;
        maxRequests?: number;
        windowMs?: number;
    };
    tenantRateLimiting?: boolean;
    /**
     * Service-specific env-var rules appended to the platform-wide set
     * checked by validate-env.ts. Optional rules emit warnings; required
     * rules cause the service to refuse to boot in production.
     */
    envRules?: EnvRule[];
}
export interface ModuleRegistration {
    moduleCode: string;
    register: (app: Express) => Promise<void>;
}
export interface RouteRegistration {
    path: string;
    router: express.Router;
}
export declare function createServiceServer(config: ServiceConfig): Promise<{
    app: Express;
    start: () => Promise<import('http').Server>;
}>;
declare function createLogger(serviceCode: string): pino.Logger<never, boolean>;
export { createLogger };
export { createHealthRouter, dbHealthCheck, redisHealthCheck, eventBusHealthCheck } from './health';
export { loadModuleRoute, loadModuleExports, getModuleLoadResults, modulesDiagnosticRouter } from './module-loader';
export { runServiceMigrations, rollbackServiceMigrations } from './migration-runner';
export type { MigrationRunnerOptions } from './migration-runner';
export { setupServiceOpenApi } from './openapi';
export type { OpenApiConfig } from './openapi';
export { validateCriticalEnv, enforceEnvValidation } from './validate-env';
export type { EnvRule, EnvValidationResult } from './validate-env';
export { initErrorTelemetry, captureException, captureMessage, sentry } from './error-telemetry';
export { initFeatureFlags, getClient as getFlagClient, getFlag, getFlagBool, getFlagString } from './feature-flags';
export { createCsrfMiddleware } from './csrf';
export { createBreaker, getBreaker, listBreakerStates } from './circuit-breaker';
export { acquireLock, withLock, getRedlock } from './distributed-lock';
export { getSecret, vaultEnabled, clearSecretCache } from './vault';
export declare function bootstrapService(serviceCode: string, opts: {
    mountBase: string;
    router: any;
    migrationsDir?: string;
}): Promise<Express>;
//# sourceMappingURL=index.d.ts.map
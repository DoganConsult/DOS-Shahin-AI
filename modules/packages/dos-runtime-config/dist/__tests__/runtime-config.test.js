"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("../index");
(0, vitest_1.describe)('loadServiceConfig', () => {
    (0, vitest_1.beforeEach)(() => {
        process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
        process.env.REDIS_URL = 'redis://localhost:6379';
    });
    (0, vitest_1.it)('loads config with defaults', () => {
        const config = (0, index_1.loadServiceConfig)('test-service');
        (0, vitest_1.expect)(config.serviceCode).toBe('test-service');
        (0, vitest_1.expect)(config.port).toBeDefined();
        (0, vitest_1.expect)(config.db.connectionString).toBeDefined();
    });
    (0, vitest_1.it)('respects PORT env var', () => {
        process.env.PORT = '9999';
        const config = (0, index_1.loadServiceConfig)('test-service');
        (0, vitest_1.expect)(config.port).toBe(9999);
        delete process.env.PORT;
    });
    (0, vitest_1.it)('allows skip validation', () => {
        delete process.env.DATABASE_URL;
        delete process.env.REDIS_URL;
        (0, vitest_1.expect)(() => (0, index_1.loadServiceConfig)('test-service', { skipValidation: true })).not.toThrow();
    });
    (0, vitest_1.it)('applies overrides', () => {
        const config = (0, index_1.loadServiceConfig)('test-service', { overrides: { logLevel: 'debug' } });
        (0, vitest_1.expect)(config.logLevel).toBe('debug');
    });
});
(0, vitest_1.describe)('Phase 2 — RLS_ENABLED is mandatory in production', () => {
    const envBackup = {};
    (0, vitest_1.beforeEach)(() => {
        envBackup.NODE_ENV = process.env.NODE_ENV;
        envBackup.RLS_ENABLED = process.env.RLS_ENABLED;
        process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
        process.env.REDIS_URL = 'redis://localhost:6379';
    });
    (0, vitest_1.afterEach)(() => {
        if (envBackup.NODE_ENV === undefined)
            delete process.env.NODE_ENV;
        else
            process.env.NODE_ENV = envBackup.NODE_ENV;
        if (envBackup.RLS_ENABLED === undefined)
            delete process.env.RLS_ENABLED;
        else
            process.env.RLS_ENABLED = envBackup.RLS_ENABLED;
    });
    (0, vitest_1.it)('production + RLS_ENABLED=true → boots', () => {
        process.env.NODE_ENV = 'production';
        process.env.RLS_ENABLED = 'true';
        (0, vitest_1.expect)(() => (0, index_1.loadServiceConfig)('test-service')).not.toThrow();
    });
    (0, vitest_1.it)('production + RLS_ENABLED=false → throws ConfigValidationError', () => {
        process.env.NODE_ENV = 'production';
        process.env.RLS_ENABLED = 'false';
        (0, vitest_1.expect)(() => (0, index_1.loadServiceConfig)('test-service')).toThrow(index_1.ConfigValidationError);
        (0, vitest_1.expect)(() => (0, index_1.loadServiceConfig)('test-service')).toThrow(/RLS_ENABLED must be exactly "true"/);
    });
    (0, vitest_1.it)('production + RLS_ENABLED unset → throws', () => {
        process.env.NODE_ENV = 'production';
        delete process.env.RLS_ENABLED;
        (0, vitest_1.expect)(() => (0, index_1.loadServiceConfig)('test-service')).toThrow(/RLS_ENABLED must be exactly "true"/);
    });
    (0, vitest_1.it)('production + RLS_ENABLED="TRUE" (wrong case) → throws', () => {
        process.env.NODE_ENV = 'production';
        process.env.RLS_ENABLED = 'TRUE';
        (0, vitest_1.expect)(() => (0, index_1.loadServiceConfig)('test-service')).toThrow(/RLS_ENABLED must be exactly "true"/);
    });
    (0, vitest_1.it)('production + RLS_ENABLED="1" → throws (exact-match policy)', () => {
        process.env.NODE_ENV = 'production';
        process.env.RLS_ENABLED = '1';
        (0, vitest_1.expect)(() => (0, index_1.loadServiceConfig)('test-service')).toThrow(/RLS_ENABLED must be exactly "true"/);
    });
    (0, vitest_1.it)('development + RLS_ENABLED unset → boots (dev does not require RLS)', () => {
        process.env.NODE_ENV = 'development';
        delete process.env.RLS_ENABLED;
        (0, vitest_1.expect)(() => (0, index_1.loadServiceConfig)('test-service')).not.toThrow();
    });
    (0, vitest_1.it)('staging + RLS_ENABLED unset → boots (gate is production-only; staging owner decides)', () => {
        process.env.NODE_ENV = 'staging';
        delete process.env.RLS_ENABLED;
        (0, vitest_1.expect)(() => (0, index_1.loadServiceConfig)('test-service')).not.toThrow();
    });
});
//# sourceMappingURL=runtime-config.test.js.map
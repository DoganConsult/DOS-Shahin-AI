"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigValidationError = exports.ServiceRuntimeConfigSchema = void 0;
exports.loadServiceConfig = loadServiceConfig;
exports.loadDbConfigOverlay = loadDbConfigOverlay;
exports.getJourneyFeatureFlags = getJourneyFeatureFlags;
exports.required = required;
exports.optional = optional;
exports.optionalInt = optionalInt;
exports.optionalBool = optionalBool;
const zod_1 = require("zod");
exports.ServiceRuntimeConfigSchema = zod_1.z.object({
    serviceCode: zod_1.z.string().min(1),
    port: zod_1.z.number().int().min(1).max(65535),
    nodeEnv: zod_1.z.enum(['development', 'production', 'staging', 'test']),
    logLevel: zod_1.z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']),
    db: zod_1.z.object({
        connectionString: zod_1.z.string().url(),
        poolMax: zod_1.z.number().int().min(1),
        ssl: zod_1.z.boolean(),
    }),
    redis: zod_1.z.object({
        url: zod_1.z.string().url(),
        prefix: zod_1.z.string().min(1),
    }),
    services: zod_1.z.record(zod_1.z.string(), zod_1.z.string().url()),
});
class ConfigValidationError extends Error {
    issues;
    constructor(serviceCode, issues) {
        const summary = issues.map(i => `  - ${i.field}: ${i.message}`).join('\n');
        super(`[runtime-config] ${serviceCode} failed boot-time validation:\n${summary}`);
        this.name = 'ConfigValidationError';
        this.issues = issues;
    }
}
exports.ConfigValidationError = ConfigValidationError;
function required(key) {
    const val = process.env[key];
    if (!val)
        throw new Error(`[runtime-config] Missing required env var: ${key}`);
    return val;
}
function optional(key, fallback) {
    return process.env[key] || fallback;
}
function optionalInt(key, fallback) {
    const val = process.env[key];
    return val ? parseInt(val, 10) : fallback;
}
function optionalBool(key, fallback) {
    const val = process.env[key];
    if (!val)
        return fallback;
    return val === 'true' || val === '1';
}
function loadServiceConfig(serviceCode, options) {
    const services = {
        auth: optional('AUTH_SERVICE_URL', 'http://127.0.0.1:4001'),
        tenant: optional('TENANT_SERVICE_URL', 'http://127.0.0.1:4002'),
        user: optional('USER_SERVICE_URL', 'http://127.0.0.1:4003'),
        workflow: optional('WORKFLOW_SERVICE_URL', 'http://127.0.0.1:4004'),
        notification: optional('NOTIFICATION_SERVICE_URL', 'http://127.0.0.1:4005'),
        audit: optional('AUDIT_SERVICE_URL', 'http://127.0.0.1:4006'),
        aiGateway: optional('AI_GATEWAY_SERVICE_URL', 'http://127.0.0.1:4007'),
    };
    if (options?.additionalServices) {
        for (const [name, def] of Object.entries(options.additionalServices)) {
            services[name] = optional(def.envVar, def.defaultUrl);
        }
    }
    const configParams = {
        serviceCode,
        port: optionalInt('PORT', 4000),
        nodeEnv: optional('NODE_ENV', 'development'),
        logLevel: optional('LOG_LEVEL', 'info'),
        db: {
            connectionString: optional('DATABASE_URL', `postgresql://${optional('PG_USER', 'shahin')}:${optional('PG_PASSWORD', '')}@${optional('PG_HOST', 'localhost')}:${optional('PG_PORT', '5432')}/${optional('PG_DATABASE', 'shahin_grc')}`),
            poolMax: optionalInt('DB_POOL_MAX', 10),
            ssl: optionalBool('PG_SSL', false),
        },
        redis: {
            url: optional('REDIS_URL', `redis://${optional('REDIS_HOST', '127.0.0.1')}:${optional('REDIS_PORT', '6379')}`),
            prefix: optional('REDIS_PREFIX', 'dos:'),
        },
        services,
        ...options?.overrides,
    };
    if (!options?.skipValidation) {
        const parsed = exports.ServiceRuntimeConfigSchema.safeParse(configParams);
        if (!parsed.success) {
            const issues = parsed.error.issues.map(i => ({
                field: i.path.join('.'),
                message: i.message,
            }));
            throw new ConfigValidationError(serviceCode, issues);
        }
        // Phase 2 tenant-safety gate: in production, RLS must be explicitly on.
        // packages/dos-db/src/tenant.ts only sets app.current_tenant_id /
        // app.current_user_id GUCs when RLS_ENABLED='true'. If RLS is off in
        // production, the database has no row-level defence against cross-tenant
        // reads — boot must fail fast, not warn and continue.
        if (configParams.nodeEnv === 'production' && process.env.RLS_ENABLED !== 'true') {
            throw new ConfigValidationError(serviceCode, [{
                    field: 'RLS_ENABLED',
                    message: 'RLS_ENABLED must be exactly "true" in production. Row-level security is the last defence for tenant isolation and cannot be disabled on prod deployments.',
                    value: process.env.RLS_ENABLED ?? '<unset>',
                }]);
        }
    }
    return configParams;
}
/**
 * Load DB-driven config overlay and inject into process.env.
 * Called AFTER DB pool is initialized. Reads dos.config_values and
 * dos.platform_operation_config, then injects non-secret values
 * into process.env so all services pick them up.
 */
const DB_OVERLAY_TIMEOUT_MS = parseInt(process.env.DB_OVERLAY_TIMEOUT_MS ?? '8000', 10);
async function loadDbConfigOverlay(serviceCode) {
    let loaded = 0;
    let skipped = 0;
    let getPool;
    try {
        const db = await import('@dos/db');
        if (typeof db.getPool !== 'function') {
            throw new Error('@dos/db does not export getPool() — incompatible package version');
        }
        getPool = () => db.getPool();
    }
    catch (err) {
        console.warn(`[runtime-config] ${serviceCode}: @dos/db unavailable — DB config overlay skipped (using env defaults): ${err.message}`);
        return { loaded, skipped };
    }
    const timeoutMs = DB_OVERLAY_TIMEOUT_MS;
    let timeoutHandle = undefined;
    try {
        const pool = getPool();
        const healthResult = await Promise.race([
            pool.query('SELECT 1 AS health'),
            new Promise((_, reject) => {
                timeoutHandle = setTimeout(() => {
                    reject(new Error(`DB health check timed out after ${timeoutMs}ms — pool may be exhausted or DB unreachable`));
                }, timeoutMs);
            }),
        ]);
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            timeoutHandle = undefined;
        }
        if (healthResult.rows[0]?.health !== 1) {
            console.warn(`[runtime-config] ${serviceCode}: DB health check returned unexpected result — skipping overlay`);
            return { loaded, skipped };
        }
        const { safeQuery } = await import('@dos/db');
        const definitions = await Promise.race([
            safeQuery(`SELECT cd.key, cd.default_value, cd.is_secret, cd.deployment_only,
                cv.value AS override_value
         FROM dos.config_definitions cd
         LEFT JOIN dos.config_values cv ON cv.definition_id = cd.id
           AND cv.scope_type = 'platform' AND cv.is_active = TRUE
         WHERE cd.ui_exposable = TRUE OR cd.deployment_only = FALSE`),
            new Promise((_, reject) => {
                timeoutHandle = setTimeout(() => {
                    reject(new Error(`Config definitions query timed out after ${timeoutMs}ms`));
                }, timeoutMs);
            }),
        ]);
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            timeoutHandle = undefined;
        }
        for (const row of definitions.rows) {
            if (!row.key || typeof row.key !== 'string') {
                skipped++;
                continue;
            }
            const envKey = String(row.key).replace(/\./g, '_').toUpperCase();
            if (process.env[envKey] !== undefined) {
                skipped++;
                continue;
            }
            if (row.is_secret) {
                skipped++;
                continue;
            }
            const value = row.override_value ?? row.default_value;
            if (value !== null && value !== undefined) {
                const parsed = typeof value === 'string' ? value : JSON.stringify(value);
                const clean = parsed.startsWith('"') && parsed.endsWith('"')
                    ? parsed.slice(1, -1)
                    : parsed;
                process.env[envKey] = clean;
                loaded++;
            }
        }
        const opConfigs = await Promise.race([
            safeQuery(`SELECT config_key, config_value FROM dos.platform_operation_config`),
            new Promise((_, reject) => {
                timeoutHandle = setTimeout(() => {
                    reject(new Error(`Platform operation config query timed out after ${timeoutMs}ms`));
                }, timeoutMs);
            }),
        ]);
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            timeoutHandle = undefined;
        }
        for (const row of opConfigs.rows) {
            if (!row.config_key || typeof row.config_key !== 'string') {
                skipped++;
                continue;
            }
            const envKey = String(row.config_key).replace(/\./g, '_').toUpperCase();
            if (process.env[envKey] === undefined && row.config_value) {
                process.env[envKey] = typeof row.config_value === 'string'
                    ? row.config_value
                    : JSON.stringify(row.config_value);
                loaded++;
            }
        }
        console.log(`[runtime-config] ${serviceCode}: loaded ${loaded} DB config values, skipped ${skipped} (env-overridden or secret)`);
    }
    catch (err) {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            timeoutHandle = undefined;
        }
        const msg = err.message;
        if (msg.includes('timed out')) {
            console.warn(`[runtime-config] ${serviceCode}: DB config overlay timed out (using env defaults): ${msg}`);
        }
        else if (msg.includes('connection refused') || msg.includes('ECONNREFUSED')) {
            console.warn(`[runtime-config] ${serviceCode}: DB config overlay unreachable (using env defaults): ${msg}`);
        }
        else if (msg.includes('password authentication failed') || msg.includes('FATAL')) {
            console.error(`[runtime-config] ${serviceCode}: DB config overlay auth failed — check credentials: ${msg}`);
        }
        else {
            console.warn(`[runtime-config] ${serviceCode}: DB config overlay failed (using env defaults): ${msg}`);
        }
    }
    return { loaded, skipped };
}
function getJourneyFeatureFlags() {
    const nodeEnv = process.env.NODE_ENV || 'development';
    return {
        onboardingRequireEmailVerified: optionalBool('ONBOARDING_REQUIRE_EMAIL_VERIFIED', false),
        onboardingEmailVerificationEnabled: optionalBool('ONBOARDING_EMAIL_VERIFICATION_ENABLED', true),
        captchaRequired: optionalBool('CAPTCHA_REQUIRED', nodeEnv === 'production'),
        provisioningWorkerEnabled: optionalBool('PROVISIONING_WORKER_ENABLED', true),
        foundationIntakeOnly: optionalBool('SHAHIN_FOUNDATION_INTAKE_ONLY', true),
    };
}
//# sourceMappingURL=index.js.map
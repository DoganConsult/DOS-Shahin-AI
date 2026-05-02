"use strict";
// ============================================
// DOS Platform — Environment Validation
// Validates critical environment variables at service startup.
// Services refuse to boot if required vars are missing.
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCriticalEnv = validateCriticalEnv;
exports.enforceEnvValidation = enforceEnvValidation;
// Critical env vars required by ALL services
const PLATFORM_ENV_RULES = [
    // Database
    { name: 'DATABASE_URL', required: true, secret: true, description: 'PostgreSQL connection string' },
    // Auth
    { name: 'JWT_SECRET', required: true, secret: true, description: 'JWT signing secret (≥32 chars)',
        validator: (v) => v.length >= 32 && v !== 'CHANGE_ME_MIN_32_CHARS_RANDOM_STRING' },
    { name: 'JWT_REFRESH_SECRET', required: true, secret: true, description: 'JWT refresh signing secret (≥32 chars)',
        validator: (v) => v.length >= 32 && v !== 'CHANGE_ME_ANOTHER_32_CHARS_RANDOM_STRING' },
    { name: 'SECRETS_ENCRYPTION_KEY', required: true, secret: true, description: 'AES encryption key (32-byte hex)',
        validator: (v) => v !== 'CHANGE_ME_32_BYTE_HEX_KEY' },
    // Runtime
    { name: 'NODE_ENV', required: false, description: 'Runtime environment (development|staging|production)' },
    { name: 'LOG_LEVEL', required: false, description: 'Logging level (debug|info|warn|error)' },
    // Redis — required across the fleet because event-backbone, distributed-lock,
    // SSE pub/sub, rate-limit and tenant cache all depend on it. Missing
    // password against a `requirepass`-protected instance produces NOAUTH /
    // WRONGPASS at first command, which historically masqueraded as random
    // 500s and caused the wave-2 onboarding-service crash-loop. The validator
    // below requires the password to be embedded in the URL when one is set.
    { name: 'REDIS_URL', required: true, secret: true, description: 'Redis URL (must embed auth, e.g. redis://:<pw>@host:port/db)',
        validator: (v) => {
            try {
                const u = new URL(v);
                if (u.protocol !== 'redis:' && u.protocol !== 'rediss:')
                    return false;
                // Allow plaintext only when explicitly opted-in (local dev without requirepass).
                if (process.env.REDIS_ALLOW_NOAUTH === 'true')
                    return true;
                return Boolean(u.password);
            }
            catch {
                return false;
            }
        },
    },
    { name: 'REDIS_HOST', required: false, description: 'Redis host (consumed by @dos/db buildRedisOptions)' },
    { name: 'REDIS_PORT', required: false, description: 'Redis port (consumed by @dos/db buildRedisOptions)' },
    { name: 'REDIS_PASSWORD', required: false, secret: true, description: 'Redis password (discrete-var clients)' },
];
/**
 * Validate critical environment variables at service startup.
 * Returns validation result with errors (missing required) and warnings (missing optional / placeholder values).
 */
function validateCriticalEnv(serviceCode, extraRules = []) {
    const rules = [...PLATFORM_ENV_RULES, ...extraRules];
    const errors = [];
    const warnings = [];
    for (const rule of rules) {
        const value = process.env[rule.name];
        if (!value || value.trim() === '') {
            if (rule.required) {
                errors.push(`[${serviceCode}] Missing required env var: ${rule.name} — ${rule.description || ''}`);
            }
            else {
                warnings.push(`[${serviceCode}] Missing optional env var: ${rule.name} — ${rule.description || ''}`);
            }
            continue;
        }
        if (rule.validator && !rule.validator(value)) {
            if (rule.required) {
                errors.push(`[${serviceCode}] Invalid env var ${rule.name}: failed validation — ${rule.description || ''}`);
            }
            else {
                warnings.push(`[${serviceCode}] Env var ${rule.name} has a placeholder value — update before production`);
            }
        }
    }
    return { valid: errors.length === 0, errors, warnings };
}
/**
 * Validate environment and log results. If critical vars are missing in production, refuse to boot.
 */
function enforceEnvValidation(serviceCode, logger, extraRules = []) {
    const result = validateCriticalEnv(serviceCode, extraRules);
    for (const w of result.warnings) {
        logger.warn(w);
    }
    if (!result.valid) {
        for (const e of result.errors) {
            logger.error(e);
        }
        if (process.env.NODE_ENV === 'production') {
            throw new Error(`[${serviceCode}] Refusing to boot — ${result.errors.length} critical env var(s) missing. See logs above.`);
        }
        else {
            logger.warn(`[${serviceCode}] ${result.errors.length} env validation error(s) — continuing in ${process.env.NODE_ENV || 'development'} mode`);
        }
    }
    else {
        logger.info(`[${serviceCode}] Environment validation passed (${PLATFORM_ENV_RULES.length + extraRules.length} rules checked)`);
    }
}
//# sourceMappingURL=validate-env.js.map
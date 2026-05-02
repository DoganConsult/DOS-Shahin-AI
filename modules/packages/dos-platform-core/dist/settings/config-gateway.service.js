"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigGateway = void 0;
const db_1 = require("@dos/db");
const observability_1 = require("../observability");
const unified_config_service_1 = require("./unified-config.service");
const BOOTSTRAP_KEYS = new Set([
    'PG_HOST', 'PG_PORT', 'PG_DATABASE', 'PG_USER', 'PG_PASSWORD', 'DATABASE_URL',
    'PG_SSL', 'PG_SSL_CA', 'PG_POOL_MAX', 'PG_IDLE_TIMEOUT_MS',
    'PG_CONNECTION_TIMEOUT_MS', 'PG_STATEMENT_TIMEOUT_MS',
    'REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD', 'REDIS_DB', 'REDIS_PREFIX',
    'JWT_SECRET', 'JWT_EXPIRES_IN', 'JWT_REFRESH_SECRET',
    'NODE_ENV', 'PORT', 'LOG_LEVEL',
]);
let initialized = false;
const overrideCache = new Map();
const resolvedCache = new Map();
const CACHE_TTL_MS = 30_000;
async function loadOverridesFromDb() {
    try {
        const result = await (0, db_1.safeQuery)(`SELECT config_key, config_value, set_by, set_at FROM public.config_runtime_overrides`, []);
        overrideCache.clear();
        for (const row of result.rows) {
            let value;
            try {
                value = JSON.parse(row.config_value);
            }
            catch {
                value = row.config_value;
            }
            overrideCache.set(row.config_key, {
                value,
                setBy: row.set_by,
                setAt: row.set_at,
            });
        }
    }
    catch { }
}
async function persistOverride(key, entry) {
    try {
        await (0, db_1.safeQuery)(`INSERT INTO public.config_runtime_overrides (config_key, config_value, set_by, set_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (config_key) DO UPDATE SET
         config_value = EXCLUDED.config_value,
         set_by = EXCLUDED.set_by,
         set_at = EXCLUDED.set_at`, [key, JSON.stringify(entry.value), entry.setBy, entry.setAt]);
    }
    catch { }
}
async function deleteOverrideFromDb(key) {
    try {
        await (0, db_1.safeQuery)(`DELETE FROM public.config_runtime_overrides WHERE config_key = $1`, [key]);
    }
    catch { }
}
function parseEnvValue(value) {
    if (value === undefined) {
        return undefined;
    }
    if (value === 'true') {
        return true;
    }
    if (value === 'false') {
        return false;
    }
    if (value !== '' && !Number.isNaN(Number(value))) {
        return Number(value);
    }
    return value;
}
class ConfigGateway {
    static isInitialized() {
        return initialized;
    }
    static async initialize() {
        if (initialized) {
            return;
        }
        await loadOverridesFromDb();
        initialized = true;
        observability_1.logger.info('[ConfigGateway] Initialized');
    }
    static getSync(key) {
        if (BOOTSTRAP_KEYS.has(key)) {
            return parseEnvValue(process.env[key]);
        }
        const override = overrideCache.get(key);
        if (override !== undefined) {
            return override.value;
        }
        const cached = resolvedCache.get(key);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.value;
        }
        const envValue = parseEnvValue(process.env[key]);
        if (envValue !== undefined) {
            resolvedCache.set(key, {
                value: envValue,
                source: 'environment',
                expiresAt: Date.now() + CACHE_TTL_MS,
            });
            return envValue;
        }
        const metadata = unified_config_service_1.UnifiedConfigService.resolveSyncWithMetadata(key);
        resolvedCache.set(key, {
            value: metadata.value,
            source: metadata.source,
            expiresAt: Date.now() + CACHE_TTL_MS,
        });
        return metadata.value;
    }
    static async get(key, options) {
        if (BOOTSTRAP_KEYS.has(key)) {
            return parseEnvValue(process.env[key]);
        }
        const override = overrideCache.get(key);
        if (override !== undefined) {
            return override.value;
        }
        const metadata = await unified_config_service_1.UnifiedConfigService.resolveWithMetadata(key, options);
        resolvedCache.set(key, {
            value: metadata.value,
            source: metadata.source,
            expiresAt: Date.now() + CACHE_TTL_MS,
        });
        return metadata.value;
    }
    static getString(key, fallback = '') {
        const value = this.getSync(key);
        return value !== undefined && value !== null ? String(value) : fallback;
    }
    static getNumber(key, fallback = 0) {
        const value = this.getSync(key);
        const numberValue = Number(value);
        return !Number.isNaN(numberValue) && value !== undefined && value !== null ? numberValue : fallback;
    }
    static getBool(key, fallback = false) {
        const value = this.getSync(key);
        if (value === true || value === 'true') {
            return true;
        }
        if (value === false || value === 'false') {
            return false;
        }
        return fallback;
    }
    static setOverride(key, value, setBy) {
        const entry = {
            value,
            setBy,
            setAt: new Date().toISOString(),
        };
        overrideCache.set(key, entry);
        resolvedCache.delete(key);
        persistOverride(key, entry).catch(() => { });
        observability_1.logger.info('[ConfigGateway] Runtime override set', { key, setBy });
    }
    static clearOverride(key) {
        overrideCache.delete(key);
        resolvedCache.delete(key);
        deleteOverrideFromDb(key).catch(() => { });
    }
    static getOverrides() {
        return Object.fromEntries(overrideCache);
    }
    static invalidateCache(key) {
        if (key) {
            resolvedCache.delete(key);
            return;
        }
        resolvedCache.clear();
    }
    static isBootstrapKey(key) {
        return BOOTSTRAP_KEYS.has(key);
    }
    static getFullInventory() {
        const keys = new Set([
            ...Object.keys(process.env),
            ...overrideCache.keys(),
            ...resolvedCache.keys(),
        ]);
        return [...keys]
            .sort((left, right) => left.localeCompare(right))
            .map((key) => {
            const override = overrideCache.get(key);
            const cached = resolvedCache.get(key);
            const envValue = parseEnvValue(process.env[key]);
            const currentValue = override?.value ?? cached?.value ?? envValue ?? this.getSync(key);
            const source = override
                ? 'runtime_override'
                : cached?.source ?? (envValue !== undefined ? 'environment' : 'platform');
            return {
                key,
                bootstrap: BOOTSTRAP_KEYS.has(key),
                hasOverride: Boolean(override),
                currentValue,
                source,
                setBy: override?.setBy,
                setAt: override?.setAt,
            };
        });
    }
}
exports.ConfigGateway = ConfigGateway;
//# sourceMappingURL=config-gateway.service.js.map
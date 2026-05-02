"use strict";
// ============================================
// Platform — Module AI Configuration Registry
// Manages per-module AI configuration with
// tenant-level overrides. Used by all modules
// to configure AI behavior, safety hooks,
// and human-in-loop boundaries.
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerModuleAiConfig = registerModuleAiConfig;
exports.getDefaultAiConfig = getDefaultAiConfig;
exports.resolveAiConfig = resolveAiConfig;
exports.invalidateTenantAiCache = invalidateTenantAiCache;
exports.getAllRegisteredAiConfigs = getAllRegisteredAiConfigs;
exports.isActionAllowed = isActionAllowed;
exports.isActionBlocked = isActionBlocked;
exports.requiresHumanApproval = requiresHumanApproval;
const db_1 = require("@dos/db");
const observability_1 = require("../observability");
const _defaults = new Map();
const _tenantOverrideCache = new Map();
const CACHE_TTL_MS = 60_000;
function registerModuleAiConfig(config) {
    if (_defaults.has(config.moduleCode)) {
        observability_1.logger.warn(`[AiConfigRegistry] overwriting config for module '${config.moduleCode}'`);
    }
    _defaults.set(config.moduleCode, config);
}
function getDefaultAiConfig(moduleCode) {
    return _defaults.get(moduleCode);
}
function buildCacheKey(tenantId, moduleCode) {
    return `${tenantId}::${moduleCode}`;
}
async function loadTenantOverride(tenantId, moduleCode) {
    const key = buildCacheKey(tenantId, moduleCode);
    const cached = _tenantOverrideCache.get(key);
    if (cached && cached.expiresAt > Date.now())
        return cached.override;
    try {
        const schema = (0, db_1.tenantSchema)(tenantId);
        const result = await (0, db_1.safeQuery)(`SELECT config_value FROM "${schema}".module_ai_overrides WHERE module_code = $1 AND active = true LIMIT 1`, [moduleCode]);
        const row = result.rows[0];
        const override = row?.config_value
            ? (typeof row.config_value === 'string' ? JSON.parse(row.config_value) : row.config_value)
            : {};
        _tenantOverrideCache.set(key, { override, expiresAt: Date.now() + CACHE_TTL_MS });
        return override;
    }
    catch {
        _tenantOverrideCache.set(key, { override: {}, expiresAt: Date.now() + CACHE_TTL_MS });
        return {};
    }
}
async function resolveAiConfig(tenantId, moduleCode) {
    const base = _defaults.get(moduleCode);
    if (!base)
        throw new Error(`No AI config registered for module '${moduleCode}'`);
    const override = await loadTenantOverride(tenantId, moduleCode);
    if (!override || Object.keys(override).length === 0)
        return base;
    return {
        ...base,
        enabled: override.enabled ?? base.enabled,
        modelDependencies: {
            ...base.modelDependencies,
            primary: override.primaryModel ?? base.modelDependencies.primary,
            fallback: override.fallbackModel ?? base.modelDependencies.fallback,
        },
        promptContracts: {
            ...base.promptContracts,
            maxOutputTokens: override.maxOutputTokens ?? base.promptContracts.maxOutputTokens,
            temperature: override.temperature ?? base.promptContracts.temperature,
        },
        safetyHooks: {
            ...base.safetyHooks,
            maxInvocationsPerHour: override.maxInvocationsPerHour ?? base.safetyHooks.maxInvocationsPerHour,
            rateLimitPerTenant: override.rateLimitPerTenant ?? base.safetyHooks.rateLimitPerTenant,
        },
    };
}
function invalidateTenantAiCache(tenantId, moduleCode) {
    if (moduleCode) {
        _tenantOverrideCache.delete(buildCacheKey(tenantId, moduleCode));
    }
    else {
        for (const key of _tenantOverrideCache.keys()) {
            if (key.startsWith(`${tenantId}::`))
                _tenantOverrideCache.delete(key);
        }
    }
}
function getAllRegisteredAiConfigs() {
    return _defaults;
}
function isActionAllowed(config, action) {
    return config.allowedActions.includes(action);
}
function isActionBlocked(config, action) {
    return config.blockedActions.includes(action);
}
function requiresHumanApproval(config, action) {
    return config.humanInLoopBoundaries.requiresHumanApproval.includes(action);
}
//# sourceMappingURL=ai-config.registry.js.map
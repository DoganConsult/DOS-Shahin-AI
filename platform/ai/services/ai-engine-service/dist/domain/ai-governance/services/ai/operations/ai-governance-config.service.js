// @ts-nocheck
import { safeQuery, tenantSchema } from '../../../ports/database.port';
const VALID_MODES = ['audit', 'warn', 'enforce'];
const CONFIG_KEY = 'ai_governance_enforcement_mode';
const CACHE_TTL_MS = 60_000;
const _cache = new Map();
let _globalFallback = 'audit';
export function getGlobalFallbackMode() {
    return _globalFallback;
}
export function setGlobalFallbackMode(mode) {
    safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return {};
}
export async function getTenantEnforcementMode(tenantId) {
    const cached = _cache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.mode;
    }
    try {
        const schema = tenantSchema(tenantId);
        const result = await safeQuery(`SELECT config_value FROM "${schema}".platform_operation_config WHERE config_key = $1 AND owner_module = 'ai_governance' LIMIT 1`, [CONFIG_KEY]);
        if (result.rows.length > 0) {
            let raw = result.rows[0].config_value;
            if (typeof raw === 'string') {
                raw = raw.replace(/^"|"$/g, '');
            }
            if (VALID_MODES.includes(raw)) {
                const mode = raw;
                _cache.set(tenantId, { mode, expiresAt: Date.now() + CACHE_TTL_MS });
                return mode;
            }
        }
    }
    catch {
    }
    return _globalFallback;
}
export async function setTenantEnforcementMode(tenantId, mode) {
    await safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return {};
}
export function clearEnforcementCache(tenantId) {
    if (tenantId) {
        _cache.delete(tenantId);
    }
    else {
        _cache.clear();
    }
}
//# sourceMappingURL=ai-governance-config.service.js.map
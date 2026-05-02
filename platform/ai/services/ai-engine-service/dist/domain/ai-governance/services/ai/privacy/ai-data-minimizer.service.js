// ============================================
// AI Data Minimizer (PDPL Art. 4, EU AI Act Art. 10)
// Filters data fields BEFORE sending to AI to ensure
// only necessary data crosses the trust boundary.
// ============================================
import { emptyResult, safeQuery, tenantSchema } from '../../../ports/database.port.js';
import { swallowDefault, EC } from '@dos/platform-core/resilience/resilient-catch';
const configCache = new Map();
const CACHE_TTL = 300_000;
// Default fields that should NEVER be sent to external AI
const GLOBAL_BLOCKED_FIELDS = [
    'password', 'password_hash', 'secret', 'api_key', 'token', 'jwt',
    'credit_card', 'card_number', 'cvv', 'ssn', 'national_id',
    'bank_account', 'iban', 'pin', 'private_key', 'encryption_key',
    'session_id', 'cookie', 'auth_token', 'refresh_token',
];
async function loadMinimizationConfig(tenantId) {
    const cached = configCache.get(tenantId);
    if (cached && Date.now() - cached.ts < CACHE_TTL)
        return cached.configs;
    const schema = tenantSchema(tenantId);
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT module_code, agent_id, allowed_fields, blocked_fields, max_records, max_field_length
     FROM "${schema}".ai_data_minimization_config WHERE enabled = true`), { tenantId: tenantId, operation: 'query ai_data_minimization_config' });
    const configs = result.rows;
    configCache.set(tenantId, { configs, ts: Date.now() });
    return configs;
}
/**
 * Minimize data before sending to external AI.
 * Removes blocked fields, truncates long values, caps record count.
 */
export function minimizeForAi(data, options) {
    const blocked = new Set([
        ...GLOBAL_BLOCKED_FIELDS,
        ...(options?.blockedFields || []),
    ]);
    const allowed = options?.allowedFields ? new Set(options.allowedFields) : null;
    const maxFieldLen = 500;
    return minimizeValue(data, blocked, allowed, maxFieldLen, 0);
}
function minimizeValue(value, blocked, allowed, maxLen, depth) {
    if (depth > 5)
        return '[DEPTH_LIMIT]';
    if (Array.isArray(value)) {
        // Cap arrays at 50 items for AI context
        return value.slice(0, 50).map(item => minimizeValue(item, blocked, allowed, maxLen, depth + 1));
    }
    if (value && typeof value === 'object' && !(value instanceof Date)) {
        const result = {};
        for (const [key, val] of Object.entries(value)) {
            const keyLower = key.toLowerCase();
            // Skip globally blocked fields
            if (blocked.has(keyLower))
                continue;
            // If allowlist is set, only include allowed fields
            if (allowed && !allowed.has(key) && !allowed.has(keyLower))
                continue;
            result[key] = minimizeValue(val, blocked, allowed, maxLen, depth + 1);
        }
        return result;
    }
    // Truncate long strings
    if (typeof value === 'string' && value.length > maxLen) {
        return value.slice(0, maxLen) + '...[TRUNCATED]';
    }
    return value;
}
/**
 * Load tenant-specific minimization config and apply it.
 */
export async function minimizeForAiWithConfig(tenantId, data, moduleCode, agentId) {
    const configs = await loadMinimizationConfig(tenantId);
    const match = configs.find(c => c.module_code === moduleCode && (!agentId || c.agent_id === agentId));
    return minimizeForAi(data, {
        moduleCode,
        agentId,
        allowedFields: match?.allowed_fields,
        blockedFields: match?.blocked_fields,
    });
}
export function clearMinimizationCache(tenantId) {
    if (tenantId)
        configCache.delete(tenantId);
    else
        configCache.clear();
}
//# sourceMappingURL=ai-data-minimizer.service.js.map
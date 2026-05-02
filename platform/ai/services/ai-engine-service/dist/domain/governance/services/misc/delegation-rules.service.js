import { safeQuery, tenantSchema } from '@dos/db';
import { randomUUID } from 'crypto';
function parseJsonb(val, fallback) {
    if (val === null || val === undefined)
        return fallback;
    if (typeof val === 'string') {
        try {
            return JSON.parse(val);
        }
        catch {
            return fallback;
        }
    }
    return val;
}
export async function getDelegationRules(tenantId, userId) {
    const schema = tenantSchema(tenantId);
    const configKey = `delegation_rules::${userId}`;
    const result = await safeQuery(`SELECT config_value FROM "${schema}".governance_settings WHERE config_key = $1 AND is_active = TRUE LIMIT 1`, [configKey]).catch(() => ({ rows: [] }));
    return parseJsonb(result.rows[0]?.config_value, []);
}
export async function upsertDelegationRule(tenantId, userId, rule) {
    const schema = tenantSchema(tenantId);
    const configKey = `delegation_rules::${userId}`;
    const existing = await getDelegationRules(tenantId, userId);
    const ruleId = rule.ruleId || rule.id || randomUUID();
    const entry = { ...rule, ruleId, userId };
    const idx = existing.findIndex((r) => r.ruleId === ruleId);
    if (idx >= 0) {
        existing[idx] = entry;
    }
    else {
        existing.push(entry);
    }
    await safeQuery(`INSERT INTO "${schema}".governance_settings (tenant_id, config_key, config_value, is_active, updated_at)
     VALUES ($1, $2, $3::jsonb, TRUE, NOW())
     ON CONFLICT (config_key) DO UPDATE SET config_value = $3::jsonb, is_active = TRUE, updated_at = NOW()`, [tenantId, configKey, JSON.stringify(existing)]).catch(async () => {
        await safeQuery(`INSERT INTO "${schema}".governance_settings (tenant_id, config_key, config_value, is_active, updated_at)
       VALUES ($1, $2, $3::jsonb, TRUE, NOW())`, [tenantId, configKey, JSON.stringify(existing)]);
    });
    return ruleId;
}
export async function deleteDelegationRule(tenantId, ruleId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT config_key, config_value FROM "${schema}".governance_settings WHERE config_key LIKE 'delegation_rules::%' AND is_active = TRUE`).catch(() => ({ rows: [] }));
    for (const row of result.rows) {
        const rules = parseJsonb(row.config_value, []);
        const filtered = rules.filter((r) => r.ruleId !== ruleId);
        if (filtered.length !== rules.length) {
            await safeQuery(`UPDATE "${schema}".governance_settings SET config_value = $1::jsonb, updated_at = NOW() WHERE config_key = $2`, [JSON.stringify(filtered), row.config_key]).catch(() => { });
            return true;
        }
    }
    return false;
}
export async function evaluateDelegationRule(_rule, _context) {
    return true;
}
//# sourceMappingURL=delegation-rules.service.js.map
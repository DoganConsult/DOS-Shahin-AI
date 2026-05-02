"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDelegationPolicies = getDelegationPolicies;
exports.getDelegationPolicyForRole = getDelegationPolicyForRole;
exports.validateDelegationRequest = validateDelegationRequest;
exports.evaluateDelegation = evaluateDelegation;
exports.incrementDailyActions = incrementDailyActions;
exports.getDelegationRules = getDelegationRules;
exports.upsertDelegationRule = upsertDelegationRule;
exports.deleteDelegationRule = deleteDelegationRule;
const db_1 = require("@dos/db");
const tenant_security_policy_service_1 = require("../policies/tenant-security-policy.service");
const db_2 = require("@dos/db");
const errors_1 = require("@dos/types/errors");
const observability_1 = require("@dos/platform-core/observability");
async function getDelegationPolicies(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT policy_id, role_code, max_duration_hours, allowed_scopes,
            allowed_actions, requires_approval, is_active
     FROM "${schema}".delegation_policies
     WHERE is_active = TRUE ORDER BY role_code`, []);
    return rows.map((r) => ({
        policyId: r.policy_id,
        roleCode: r.role_code,
        maxDurationHours: r.max_duration_hours ?? 24,
        allowedScopes: r.allowed_scopes ?? [],
        allowedActions: r.allowed_actions ?? [],
        requiresApproval: r.requires_approval === true,
        isActive: true,
    }));
}
async function getDelegationPolicyForRole(tenantId, roleCode) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT policy_id, role_code, max_duration_hours, allowed_scopes,
            allowed_actions, requires_approval, is_active
     FROM "${schema}".delegation_policies
     WHERE role_code = $1 AND is_active = TRUE LIMIT 1`, [roleCode]);
    const r = rows[0];
    if (!r)
        return null;
    return {
        policyId: r.policy_id,
        roleCode: r.role_code,
        maxDurationHours: r.max_duration_hours ?? 24,
        allowedScopes: r.allowed_scopes ?? [],
        allowedActions: r.allowed_actions ?? [],
        requiresApproval: r.requires_approval === true,
        isActive: true,
    };
}
async function validateDelegationRequest(tenantId, delegatorRoles, requestedScopes, requestedDurationHours) {
    const secPolicy = await (0, tenant_security_policy_service_1.getTenantSecurityPolicy)(tenantId);
    if (requestedDurationHours > secPolicy.delegationMaxDurationHours) {
        return { valid: false, reason: `duration_exceeds_max:${secPolicy.delegationMaxDurationHours}h` };
    }
    for (const role of delegatorRoles) {
        const policy = await getDelegationPolicyForRole(tenantId, role);
        if (!policy)
            continue;
        if (requestedDurationHours > policy.maxDurationHours) {
            return { valid: false, reason: `duration_exceeds_role_policy:${role}` };
        }
        const disallowed = requestedScopes.filter(s => !policy.allowedScopes.includes(s));
        if (disallowed.length > 0) {
            return { valid: false, reason: `scope_not_allowed:${disallowed.join(',')}` };
        }
    }
    return { valid: true, reason: 'policy_compliant' };
}
const RISK_ORDER = { low: 0, medium: 1, high: 2, critical: 3 };
async function evaluateDelegation(tenantId, userId, agentId, actionType, riskLevel) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    try {
        const shadowResult = await (0, db_1.safeQuery)(`SELECT enabled, consent_granted, autonomy_level, max_actions_per_day,
              actions_today, actions_today_reset
       FROM "${schema}".shadow_agent_config
       WHERE tenant_id = $1 AND user_id = $2`, [tenantId, userId]);
        if (shadowResult.rows.length === 0) {
            return { allowed: false, reason: 'No shadow agent configured for user', requiresNotification: false };
        }
        const cfg = (0, db_2.getFirstRow)(shadowResult);
        if (!cfg.enabled) {
            return { allowed: false, reason: 'Shadow agent is disabled', requiresNotification: false };
        }
        if (!cfg.consent_granted) {
            return { allowed: false, reason: 'User has not granted consent for shadow agent memory/actions (PDPL)', requiresNotification: true };
        }
        const today = new Date().toISOString().split('T')[0];
        const resetDate = cfg.actions_today_reset
            ? (cfg.actions_today_reset instanceof Date
                ? cfg.actions_today_reset.toISOString()
                : String(cfg.actions_today_reset)).split('T')[0]
            : today;
        const actionsToday = resetDate === today ? cfg.actions_today : 0;
        if (actionsToday >= cfg.max_actions_per_day) {
            return { allowed: false, reason: `Daily action limit reached (${actionsToday}/${cfg.max_actions_per_day})`, requiresNotification: true };
        }
        const ruleResult = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".delegation_rules
       WHERE tenant_id = $1 AND user_id = $2 AND agent_id = $3 AND action_type = $4`, [tenantId, userId, agentId, actionType]);
        if (ruleResult.rows.length > 0) {
            const rule = (0, db_2.getFirstRow)(ruleResult);
            if (!rule.allowed) {
                return { allowed: false, reason: `Delegation rule explicitly blocks ${actionType} for agent ${agentId}`, requiresNotification: rule.requires_notification };
            }
            const actionRisk = RISK_ORDER[riskLevel] ?? 1;
            const maxRisk = RISK_ORDER[rule.max_risk_level] ?? 1;
            if (actionRisk > maxRisk) {
                return { allowed: false, reason: `Risk level ${riskLevel} exceeds max allowed ${rule.max_risk_level} for ${actionType}`, requiresNotification: rule.requires_notification };
            }
            if (rule.time_window_start && rule.time_window_end) {
                const now = new Date();
                const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                if (hhmm < rule.time_window_start || hhmm > rule.time_window_end) {
                    return { allowed: false, reason: `Outside allowed time window (${rule.time_window_start}-${rule.time_window_end})`, requiresNotification: rule.requires_notification };
                }
            }
            return { allowed: true, reason: `Delegation rule allows ${actionType} for ${agentId}`, requiresNotification: rule.requires_notification };
        }
        return { allowed: true, reason: 'No explicit delegation rule; default allow', requiresNotification: true };
    }
    catch (err) {
        observability_1.logger.warn(`[DelegationRules] evaluateDelegation failed: ${(0, errors_1.toErrorMessage)(err)}`);
        return { allowed: false, reason: `Delegation check error: ${(0, errors_1.toErrorMessage)(err)}`, requiresNotification: true };
    }
}
async function incrementDailyActions(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const today = new Date().toISOString().split('T')[0];
    try {
        await (0, db_1.safeQuery)(`UPDATE "${schema}".shadow_agent_config
       SET actions_today = CASE WHEN actions_today_reset::text = $3 THEN actions_today + 1 ELSE 1 END,
           actions_today_reset = $3::date,
           last_active_at = NOW(),
           updated_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2`, [tenantId, userId, today]);
    }
    catch { /* non-fatal */ }
}
async function getDelegationRules(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    try {
        const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".delegation_rules
       WHERE tenant_id = $1 AND user_id = $2
       ORDER BY agent_id, action_type`, [tenantId, userId]);
        return result.rows;
    }
    catch {
        return [];
    }
}
async function upsertDelegationRule(tenantId, userId, rule) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    try {
        const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".delegation_rules
         (tenant_id, user_id, agent_id, action_type, allowed, max_risk_level,
          requires_notification, time_window_start, time_window_end, max_per_day, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (tenant_id, user_id, agent_id, action_type) DO UPDATE SET
         allowed = EXCLUDED.allowed,
         max_risk_level = EXCLUDED.max_risk_level,
         requires_notification = EXCLUDED.requires_notification,
         time_window_start = EXCLUDED.time_window_start,
         time_window_end = EXCLUDED.time_window_end,
         max_per_day = EXCLUDED.max_per_day,
         notes = EXCLUDED.notes,
         updated_at = NOW()
       RETURNING rule_id`, [
            tenantId, userId, rule.agentId, rule.actionType,
            rule.allowed ?? true,
            rule.maxRiskLevel || 'medium',
            rule.requiresNotification ?? true,
            rule.timeWindowStart || null,
            rule.timeWindowEnd || null,
            rule.maxPerDay || 10,
            rule.notes || null,
        ]);
        return (0, db_2.getFirstRow)(result)?.rule_id || null;
    }
    catch (err) {
        observability_1.logger.warn(`[DelegationRules] upsertDelegationRule failed: ${(0, errors_1.toErrorMessage)(err)}`);
        return null;
    }
}
async function deleteDelegationRule(tenantId, ruleId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    try {
        const result = await (0, db_1.safeQuery)(`DELETE FROM "${schema}".delegation_rules WHERE rule_id = $1 AND tenant_id = $2 RETURNING rule_id`, [ruleId, tenantId]);
        return result.rows.length > 0;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=delegation-policy.service.js.map
// @ts-nocheck
// ============================================
// AI Policy Service
// Governs AI action autonomy, routing, and
// escalation based on tenant blueprint policies.
// ============================================
import { safeQuery, tenantSchema } from '../../../ports/database.port.js';
import { getTenantBlueprint, logPolicyDecision } from '../../../../packs/services/blueprint.service.js';
import { isModuleActive } from '../../../ports/platform.port.js';
async function deriveUserPermissions(tenantId, userId) {
    try {
        const schema = tenantSchema(tenantId);
        const { rows: roleRows } = await safeQuery(`SELECT DISTINCT rp.permission_code FROM "${schema}".actor_role_assignments ara
       JOIN "${schema}".role_permissions rp ON rp.role_code = ara.role_code AND rp.is_active = true
       WHERE ara.user_id = $1 AND ara.is_active = true`, [userId]);
        const moduleCodes = [...new Set(roleRows.map((r) => {
                const code = String(r.permission_code || '');
                const dot = code.indexOf('.');
                return dot > 0 ? code.slice(0, dot) : code;
            }))].filter(Boolean);
        const { rows: profileRows } = await safeQuery(`SELECT ap.profile_code FROM "${schema}".actor_access_assignments aaa
       JOIN "${schema}".access_profiles ap ON ap.profile_id = aaa.profile_id AND ap.is_active = true
       WHERE aaa.user_id = $1 AND aaa.is_active = true LIMIT 1`, [userId]).catch(() => ({ rows: [] }));
        return { module_codes: moduleCodes, access_profile_code: profileRows[0]?.profile_code ?? 'standard_user' };
    }
    catch {
        return { module_codes: [], access_profile_code: 'standard_user' };
    }
}
// -----------------------------------------------
// Main AI Action Gate
// -----------------------------------------------
export async function canAiAct(tenantId, userId, moduleCode, actionClass, context = {}) {
    const schema = tenantSchema(tenantId);
    const blueprint = await getTenantBlueprint(tenantId);
    // No blueprint → block by default
    if (!blueprint) {
        const decision = blocked('No tenant blueprint — AI actions blocked until blueprint provisioned');
        await logAiDecision(tenantId, userId, moduleCode, actionClass, decision, context);
        return decision;
    }
    // Check module activation
    const moduleActive = await isModuleActive(tenantId, moduleCode);
    if (!moduleActive) {
        const decision = blocked(`Module ${moduleCode} is not active`);
        await logAiDecision(tenantId, userId, moduleCode, actionClass, decision, context);
        return decision;
    }
    // Check user has any permission in this module
    const userPerms = await deriveUserPermissions(tenantId, userId);
    const hasModuleAccess = userPerms.module_codes.includes(moduleCode)
        || userPerms.access_profile_code === 'platform_super_admin'
        || userPerms.access_profile_code === 'tenant_admin';
    if (!hasModuleAccess) {
        const decision = blocked(`User has no permissions in module ${moduleCode}`);
        await logAiDecision(tenantId, userId, moduleCode, actionClass, decision, context);
        return decision;
    }
    // Lookup AI action policy
    const { rows: policies } = await safeQuery(`SELECT autonomy_level, requires_approval, approval_role,
            max_risk_level, cooldown_minutes
     FROM "${schema}".ai_action_policies
     WHERE archetype_code = $1 AND module_code = $2 AND action_class = $3`, [blueprint.archetype_code, moduleCode, actionClass]);
    const policy = policies[0];
    if (!policy) {
        // No specific policy → default to recommend-only (no auto-execution)
        // Try to find an escalation target so approval can be routed
        const escalationTarget = await resolveEscalationTarget(tenantId, moduleCode, userId);
        const decision = {
            allowed: true,
            autonomy_level: 'recommend',
            requires_approval: false,
            approval_role: null,
            escalate_to_user_ids: escalationTarget ? [escalationTarget.user_id] : [],
            reason: `No specific AI policy for ${moduleCode}/${actionClass} — defaulting to recommend-only`,
            policy_ref: 'ai-policy.service/default',
        };
        await logAiDecision(tenantId, userId, moduleCode, actionClass, decision, context);
        return decision;
    }
    // Check risk level gate
    const riskLevel = context.riskLevel ?? 'medium';
    if (policy.autonomy_level !== 'block' && !isRiskAllowed(riskLevel, policy.max_risk_level)) {
        const decision = {
            allowed: true,
            autonomy_level: 'recommend',
            requires_approval: true,
            approval_role: policy.approval_role,
            escalate_to_user_ids: [],
            reason: `Risk level ${riskLevel} exceeds max ${policy.max_risk_level} — downgraded to recommend`,
            policy_ref: `ai_action_policies/${blueprint.archetype_code}/${moduleCode}/${actionClass}`,
        };
        // Resolve approval role to actual users
        if (policy.approval_role) {
            decision.escalate_to_user_ids = await resolveRoleToUsers(tenantId, moduleCode, policy.approval_role);
        }
        await logAiDecision(tenantId, userId, moduleCode, actionClass, decision, context);
        return decision;
    }
    // Policy says block
    if (policy.autonomy_level === 'block') {
        const decision = blocked(`AI policy blocks ${actionClass} for ${moduleCode} in archetype ${blueprint.archetype_code}`);
        await logAiDecision(tenantId, userId, moduleCode, actionClass, decision, context);
        return decision;
    }
    // Build decision
    const decision = {
        allowed: true,
        autonomy_level: policy.autonomy_level,
        requires_approval: policy.requires_approval,
        approval_role: policy.approval_role,
        escalate_to_user_ids: [],
        reason: `AI policy allows ${policy.autonomy_level} for ${moduleCode}/${actionClass}`,
        policy_ref: `ai_action_policies/${blueprint.archetype_code}/${moduleCode}/${actionClass}`,
    };
    // Resolve approval/escalation targets to actual users
    if (policy.requires_approval && policy.approval_role) {
        decision.escalate_to_user_ids = await resolveRoleToUsers(tenantId, moduleCode, policy.approval_role);
    }
    await logAiDecision(tenantId, userId, moduleCode, actionClass, decision, context);
    return decision;
}
// -----------------------------------------------
// Resolve Autonomy Level for Module (no user context)
// -----------------------------------------------
export async function resolveModuleAiAutonomy(tenantId, moduleCode) {
    const schema = tenantSchema(tenantId);
    const blueprint = await getTenantBlueprint(tenantId);
    const defaults = {
        observe: 'observe',
        recommend: 'recommend',
        draft: 'block',
        auto_assign: 'block',
        auto_execute: 'block',
        escalate: 'recommend',
        block: 'block',
    };
    if (!blueprint)
        return defaults;
    const { rows } = await safeQuery(`SELECT action_class, autonomy_level
     FROM "${schema}".ai_action_policies
     WHERE archetype_code = $1 AND module_code = $2`, [blueprint.archetype_code, moduleCode]);
    for (const row of rows) {
        defaults[row.action_class] = row.autonomy_level;
    }
    return defaults;
}
// -----------------------------------------------
// Resolve Functional Role → Actual Users
// -----------------------------------------------
export async function resolveRoleToUsers(tenantId, moduleCode, roleCodes) {
    const schema = tenantSchema(tenantId);
    const codes = Array.isArray(roleCodes) ? roleCodes : [roleCodes];
    const { rows } = await safeQuery(`SELECT DISTINCT eura.user_id
     FROM "${schema}".enterprise_user_role_assignments eura
     JOIN public.users u ON u.user_id = eura.user_id AND u.status = 'active'
     WHERE eura.functional_role_code = ANY($1)
       AND eura.module_code = $2
       AND eura.is_active = TRUE
       AND (eura.valid_to IS NULL OR eura.valid_to > NOW())
     ORDER BY eura.user_id`, [codes, moduleCode]);
    return rows.map((r) => r.user_id);
}
// -----------------------------------------------
// Resolve Escalation Target
// -----------------------------------------------
export async function resolveEscalationTarget(tenantId, moduleCode, currentUserId) {
    const schema = tenantSchema(tenantId);
    // Find someone with higher authority in the same module, excluding current user
    const { rows } = await safeQuery(`SELECT eura.user_id, eura.functional_role_code AS role_code, eura.authority_level
     FROM "${schema}".enterprise_user_role_assignments eura
     JOIN public.users u ON u.user_id = eura.user_id AND u.status = 'active'
     WHERE eura.module_code = $1
       AND eura.user_id != $2
       AND eura.is_active = TRUE
       AND (eura.valid_to IS NULL OR eura.valid_to > NOW())
       AND eura.authority_level IN ('approve_low', 'approve_medium', 'approve_high', 'override')
     ORDER BY
       CASE eura.authority_level
         WHEN 'override' THEN 6
         WHEN 'approve_high' THEN 5
         WHEN 'approve_medium' THEN 4
         WHEN 'approve_low' THEN 3
         ELSE 0
       END DESC
     LIMIT 1`, [moduleCode, currentUserId]);
    return rows[0] ?? null;
}
// -----------------------------------------------
// Helpers
// -----------------------------------------------
const RISK_RANK = {
    low: 1, medium: 2, high: 3, critical: 4,
};
function isRiskAllowed(actual, max) {
    return (RISK_RANK[actual] ?? 2) <= (RISK_RANK[max] ?? 3);
}
function blocked(reason) {
    return {
        allowed: false,
        autonomy_level: 'block',
        requires_approval: false,
        approval_role: null,
        escalate_to_user_ids: [],
        reason,
        policy_ref: 'ai-policy.service/blocked',
    };
}
async function logAiDecision(tenantId, userId, moduleCode, actionClass, decision, context) {
    await logPolicyDecision(tenantId, {
        decision_type: 'ai_action',
        user_id: userId,
        module_code: moduleCode,
        input_context: { action_class: actionClass, ...context },
        decision: decision.allowed ? decision.autonomy_level : 'blocked',
        reason: decision.reason,
        policy_ref: decision.policy_ref,
        metadata: {
            requires_approval: decision.requires_approval,
            escalate_to: decision.escalate_to_user_ids,
        },
    });
}
//# sourceMappingURL=ai-policy.service.js.map
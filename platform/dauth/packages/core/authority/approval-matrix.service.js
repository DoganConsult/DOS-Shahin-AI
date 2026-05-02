"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApprovalRules = getApprovalRules;
exports.getApprovalRule = getApprovalRule;
exports.createApprovalRule = createApprovalRule;
exports.deactivateApprovalRule = deactivateApprovalRule;
exports.isApprovalRequired = isApprovalRequired;
exports.getRequiredApprovers = getRequiredApprovers;
exports.checkActorAuthority = checkActorAuthority;
/**
 * Approval Matrix Service — DAuth canonical approval rule engine
 *
 * Reads approval matrix rules and determines required approvers for actions.
 * Rules link action codes to required authority codes with optional value thresholds.
 *
 * Also provides authority-checking for lifecycle integration:
 *   - checkActorAuthority() is called by lifecycle-auth.service.ts during
 *     transition evaluation to verify the actor satisfies approval requirements.
 *
 * @owner DAuth
 */
const db_1 = require("@dos/db");
const publish_with_dsoc_1 = require("../events/publish-with-dsoc");
const observability_1 = require("@dos/platform-core/observability");
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mapRow(r) {
    return {
        ruleId: r.rule_id,
        actionCode: r.action_code,
        moduleCode: r.module_code,
        requiredAuthorityCode: r.required_authority_code,
        minApprovals: Number(r.min_approvals),
        valueThreshold: r.value_threshold != null ? Number(r.value_threshold) : null,
        isActive: r.is_active,
    };
}
// ---------------------------------------------------------------------------
// Rule CRUD
// ---------------------------------------------------------------------------
/** List approval rules, optionally filtered by module code. */
async function getApprovalRules(tenantId, moduleCode) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const filter = moduleCode ? `AND module_code = $1` : '';
    const params = moduleCode ? [moduleCode] : [];
    const { rows } = await (0, db_1.safeQuery)(`SELECT rule_id, action_code, module_code, required_authority_code, min_approvals, value_threshold, is_active
     FROM "${schema}".approval_matrix_rules
     WHERE is_active = TRUE ${filter}
     ORDER BY action_code, module_code`, params);
    return rows.map(mapRow);
}
/** Lookup a single approval rule by ID. */
async function getApprovalRule(tenantId, ruleId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT rule_id, action_code, module_code, required_authority_code, min_approvals, value_threshold, is_active
     FROM "${schema}".approval_matrix_rules
     WHERE rule_id = $1`, [ruleId]);
    if (rows.length === 0)
        return null;
    return mapRow(rows[0]);
}
/** Create a new approval rule. */
async function createApprovalRule(tenantId, input, createdBy) {
    if (input.minApprovals < 1) {
        throw new Error('minApprovals must be at least 1.');
    }
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".approval_matrix_rules
       (action_code, module_code, required_authority_code, min_approvals, value_threshold, is_active, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, TRUE, $6, NOW(), NOW())
     RETURNING rule_id, action_code, module_code, required_authority_code, min_approvals, value_threshold, is_active`, [
        input.actionCode,
        input.moduleCode,
        input.requiredAuthorityCode,
        input.minApprovals,
        input.valueThreshold ?? null,
        createdBy,
    ]);
    const rule = mapRow(rows[0]);
    (0, publish_with_dsoc_1.publish)('dauth.approval-rule.created', tenantId, { ruleId: rule.ruleId, actionCode: rule.actionCode, createdBy });
    observability_1.logger.info(`Approval rule created: ${rule.ruleId} for ${rule.actionCode}/${rule.moduleCode} by ${createdBy}`);
    return rule;
}
/** Soft-deactivate an approval rule. */
async function deactivateApprovalRule(tenantId, ruleId, deactivatedBy) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const existing = await getApprovalRule(tenantId, ruleId);
    if (!existing) {
        throw new Error(`Approval rule "${ruleId}" not found.`);
    }
    await (0, db_1.safeQuery)(`UPDATE "${schema}".approval_matrix_rules
     SET is_active = FALSE, updated_at = NOW()
     WHERE rule_id = $1`, [ruleId]);
    (0, publish_with_dsoc_1.publish)('dauth.approval-rule.deactivated', tenantId, { ruleId, deactivatedBy });
    observability_1.logger.info(`Approval rule deactivated: ${ruleId} by ${deactivatedBy}`);
}
// ---------------------------------------------------------------------------
// Approval resolution
// ---------------------------------------------------------------------------
/** Quick check whether any active approval rule exists for the given action and module. */
async function isApprovalRequired(tenantId, action, moduleCode) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT 1 FROM "${schema}".approval_matrix_rules
     WHERE action_code = $1 AND module_code = $2 AND is_active = TRUE
     LIMIT 1`, [action, moduleCode]);
    return rows.length > 0;
}
/**
 * Determine the required approvers for an action.
 *
 * Looks up all active rules matching the action and module code.
 * If entityValue is provided, only rules whose value_threshold is NULL
 * or <= entityValue are returned (escalation-style filtering).
 */
async function getRequiredApprovers(tenantId, action, moduleCode, entityValue) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const thresholdFilter = entityValue != null
        ? `AND (value_threshold IS NULL OR value_threshold <= $3)`
        : '';
    const params = entityValue != null
        ? [action, moduleCode, entityValue]
        : [action, moduleCode];
    const { rows } = await (0, db_1.safeQuery)(`SELECT required_authority_code, min_approvals, value_threshold
     FROM "${schema}".approval_matrix_rules
     WHERE action_code = $1 AND module_code = $2 AND is_active = TRUE ${thresholdFilter}
     ORDER BY value_threshold DESC NULLS LAST`, params);
    return rows.map((r) => ({
        authorityCode: r.required_authority_code,
        minApprovals: Number(r.min_approvals),
        valueThreshold: r.value_threshold != null ? Number(r.value_threshold) : null,
    }));
}
// ---------------------------------------------------------------------------
// Lifecycle integration — actor authority check
// ---------------------------------------------------------------------------
/**
 * Check whether an actor satisfies the approval matrix for a given transition action.
 *
 * Called by lifecycle-auth.service.ts when a transition has `requires_approval = true`.
 * Looks up all approval_matrix_rules for the action+module pair, then checks
 * whether the actor holds any of the required authority codes.
 *
 * @param tenantId  - Tenant identifier
 * @param userId    - The actor attempting the transition
 * @param action    - The action code (e.g. 'risk.approve', 'policy.publish')
 * @param moduleCode - Module code
 * @param entityValue - Optional monetary/impact value for threshold-based escalation
 */
async function checkActorAuthority(tenantId, userId, action, moduleCode, entityValue) {
    const requiredApprovals = await getRequiredApprovers(tenantId, action, moduleCode, entityValue);
    // No approval rules configured — approval is not gated by the matrix
    if (requiredApprovals.length === 0) {
        return {
            canApprove: true,
            requiredApprovals: [],
            actorAuthorityCodes: [],
            reason: 'No approval matrix rules configured for this action',
        };
    }
    // Resolve the actor's authority codes
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows: authorityRows } = await (0, db_1.safeQuery)(`SELECT DISTINCT ura.authority_level_code
     FROM "${schema}".user_role_assignments ura
     WHERE ura.user_id = $1 AND ura.is_active = TRUE
       AND ura.authority_level_code IS NOT NULL`, [userId]);
    const actorAuthorityCodes = authorityRows.map((r) => r.authority_level_code);
    // Check if the actor holds any of the required authority codes
    const satisfied = requiredApprovals.some(req => actorAuthorityCodes.includes(req.authorityCode));
    if (satisfied) {
        return {
            canApprove: true,
            requiredApprovals,
            actorAuthorityCodes,
            reason: 'Actor holds required approval authority',
        };
    }
    return {
        canApprove: false,
        requiredApprovals,
        actorAuthorityCodes,
        reason: `Actor lacks required authority. Needed: ${requiredApprovals.map(r => r.authorityCode).join(', ')}. Has: ${actorAuthorityCodes.join(', ') || 'none'}`,
    };
}
//# sourceMappingURL=approval-matrix.service.js.map
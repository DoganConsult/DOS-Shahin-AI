"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSelfApproval = checkSelfApproval;
exports.isSelfApprovalAllowed = isSelfApprovalAllowed;
exports.getEntityCreator = getEntityCreator;
const db_1 = require("@dos/db");
const decision_log_service_1 = require("../audit/decision-log.service");
const tenant_security_policy_service_1 = require("../policies/tenant-security-policy.service");
async function checkSelfApproval(tenantId, actorId, entityType, entityId, action) {
    const policy = await (0, tenant_security_policy_service_1.getTenantSecurityPolicy)(tenantId);
    if (policy.selfApprovalAllowed) {
        return { allowed: true, reason: 'self_approval_allowed_by_policy' };
    }
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT created_by FROM "${schema}".${entityType}
     WHERE id = $1 LIMIT 1`, [entityId]);
    if (!rows[0]) {
        return { allowed: true, reason: 'entity_not_found_skipping_check' };
    }
    if (rows[0].created_by === actorId) {
        await (0, decision_log_service_1.logAuthDecision)(tenantId, {
            userId: actorId,
            permissionCode: `self_approval:${entityType}.${action}`,
            decision: 'deny',
            reason: 'self_approval_blocked',
            context: { entityType, entityId, action },
        });
        return { allowed: false, reason: 'self_approval_blocked' };
    }
    return { allowed: true, reason: 'different_actor' };
}
async function isSelfApprovalAllowed(tenantId) {
    const policy = await (0, tenant_security_policy_service_1.getTenantSecurityPolicy)(tenantId);
    return policy.selfApprovalAllowed;
}
async function getEntityCreator(tenantId, entityType, entityId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    try {
        const { rows } = await (0, db_1.safeQuery)(`SELECT created_by FROM "${schema}".${entityType} WHERE id = $1 LIMIT 1`, [entityId]);
        return rows[0]?.created_by ?? null;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=self-approval.guard.js.map
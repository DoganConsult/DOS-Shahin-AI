"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSignOffRequirements = getSignOffRequirements;
exports.canSignOff = canSignOff;
exports.recordSignOff = recordSignOff;
const db_1 = require("@dos/db");
const decision_authority_service_1 = require("./decision-authority.service");
const decision_log_service_1 = require("../audit/decision-log.service");
async function getSignOffRequirements(tenantId, entityType, transitionAction) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT entity_type, transition_action, required_authority_code,
            min_sign_offs, requires_different_actors
     FROM "${schema}".sign_off_requirements
     WHERE entity_type = $1 AND transition_action = $2 AND is_active = TRUE LIMIT 1`, [entityType, transitionAction]);
    if (!rows[0])
        return null;
    const r = rows[0];
    return {
        entityType: r.entity_type,
        transitionAction: r.transition_action,
        requiredAuthorityCode: r.required_authority_code,
        minSignOffs: r.min_sign_offs ?? 1,
        requiresDifferentActors: r.requires_different_actors === true,
    };
}
async function canSignOff(tenantId, userId, entityType, entityId, transitionAction) {
    const req = await getSignOffRequirements(tenantId, entityType, transitionAction);
    if (!req)
        return { allowed: true, reason: 'no_sign_off_required' };
    const hasAuth = await (0, decision_authority_service_1.hasDecisionAuthority)(tenantId, userId, req.requiredAuthorityCode);
    if (!hasAuth) {
        await (0, decision_log_service_1.logAuthDecision)(tenantId, {
            userId,
            permissionCode: `sign_off:${req.requiredAuthorityCode}`,
            decision: 'deny',
            reason: 'insufficient_authority',
        });
        return { allowed: false, reason: `requires_authority:${req.requiredAuthorityCode}` };
    }
    if (req.requiresDifferentActors) {
        const schema = (0, db_1.tenantSchema)(tenantId);
        const { rows } = await (0, db_1.safeQuery)(`SELECT signer_id FROM "${schema}".sign_off_log
       WHERE entity_type = $1 AND entity_id = $2 AND transition_action = $3
         AND signer_id = $4`, [entityType, entityId, transitionAction, userId]);
        if (rows.length > 0) {
            return { allowed: false, reason: 'already_signed_off_requires_different_actor' };
        }
    }
    return { allowed: true, reason: 'authority_confirmed' };
}
async function recordSignOff(tenantId, userId, entityType, entityId, transitionAction) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".sign_off_log (entity_type, entity_id, transition_action, signer_id, signed_at)
     VALUES ($1, $2, $3, $4, NOW())`, [entityType, entityId, transitionAction, userId]);
}
//# sourceMappingURL=sign-off-authority.service.js.map
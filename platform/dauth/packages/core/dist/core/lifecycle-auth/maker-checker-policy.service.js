"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMakerCheckerPolicy = getMakerCheckerPolicy;
exports.submitForChecking = submitForChecking;
exports.approveDecision = approveDecision;
exports.rejectDecision = rejectDecision;
exports.getPendingDecisions = getPendingDecisions;
const db_1 = require("@dos/db");
const decision_log_service_1 = require("../audit/decision-log.service");
const publish_with_dsoc_1 = require("../events/publish-with-dsoc");
async function getMakerCheckerPolicy(tenantId, entityType, action) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT entity_type, action, required_checkers, require_different_department, is_active
     FROM "${schema}".maker_checker_policies
     WHERE entity_type = $1 AND action = $2 AND is_active = TRUE LIMIT 1`, [entityType, action]);
    if (!rows[0])
        return null;
    const r = rows[0];
    return {
        entityType: r.entity_type,
        action: r.action,
        requiredCheckers: r.required_checkers ?? 1,
        requireDifferentDepartment: r.require_different_department === true,
        isActive: true,
    };
}
async function submitForChecking(tenantId, makerId, entityType, entityId, action) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".maker_checker_decisions
       (tenant_id, entity_type, entity_id, action, maker_id, status, created_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
     RETURNING decision_id, created_at`, [tenantId, entityType, entityId, action, makerId]);
    await (0, publish_with_dsoc_1.publish)('dauth.maker_checker.submitted', tenantId, { entityType, entityId, action, makerId });
    return {
        decisionId: rows[0].decision_id,
        tenantId,
        entityType,
        entityId,
        action,
        makerId,
        checkerId: null,
        status: 'pending',
        createdAt: rows[0].created_at?.toISOString?.() ?? new Date().toISOString(),
        decidedAt: null,
        reason: null,
    };
}
async function approveDecision(tenantId, decisionId, checkerId, reason) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows: decRows } = await (0, db_1.safeQuery)(`SELECT maker_id, entity_type, action FROM "${schema}".maker_checker_decisions
     WHERE decision_id = $1 AND status = 'pending' LIMIT 1`, [decisionId]);
    if (!decRows[0])
        return { success: false, reason: 'decision_not_found_or_not_pending' };
    if (decRows[0].maker_id === checkerId) {
        await (0, decision_log_service_1.logAuthDecision)(tenantId, {
            userId: checkerId,
            permissionCode: `maker_checker:${decRows[0].entity_type}.${decRows[0].action}`,
            decision: 'deny',
            reason: 'maker_cannot_be_checker',
        });
        return { success: false, reason: 'maker_cannot_be_checker' };
    }
    await (0, db_1.safeQuery)(`UPDATE "${schema}".maker_checker_decisions
     SET checker_id = $1, status = 'approved', decided_at = NOW(), reason = $2
     WHERE decision_id = $3`, [checkerId, reason ?? null, decisionId]);
    await (0, publish_with_dsoc_1.publish)('dauth.maker_checker.approved', tenantId, { decisionId, checkerId });
    return { success: true, reason: 'approved' };
}
async function rejectDecision(tenantId, decisionId, checkerId, reason) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`UPDATE "${schema}".maker_checker_decisions
     SET checker_id = $1, status = 'rejected', decided_at = NOW(), reason = $2
     WHERE decision_id = $3 AND status = 'pending'`, [checkerId, reason, decisionId]);
    await (0, publish_with_dsoc_1.publish)('dauth.maker_checker.rejected', tenantId, { decisionId, checkerId, reason });
    return { success: true, reason: 'rejected' };
}
async function getPendingDecisions(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT decision_id, tenant_id, entity_type, entity_id, action,
            maker_id, checker_id, status, created_at, decided_at, reason
     FROM "${schema}".maker_checker_decisions
     WHERE status = 'pending' ORDER BY created_at ASC`, []);
    return rows.map((r) => {
        const row = r;
        const toIso = (v) => {
            if (!v)
                return null;
            return v instanceof Date ? v.toISOString() : String(v);
        };
        return {
            decisionId: row.decision_id,
            tenantId: row.tenant_id,
            entityType: row.entity_type,
            entityId: row.entity_id,
            action: row.action,
            makerId: row.maker_id,
            checkerId: row.checker_id,
            status: row.status,
            createdAt: toIso(row.created_at) ?? '',
            decidedAt: toIso(row.decided_at),
            reason: row.reason ?? null,
        };
    });
}
//# sourceMappingURL=maker-checker-policy.service.js.map
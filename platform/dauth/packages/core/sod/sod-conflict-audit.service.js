"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectConflictsForUser = detectConflictsForUser;
exports.getUnresolvedConflicts = getUnresolvedConflicts;
exports.resolveConflict = resolveConflict;
exports.runTenantWideSodAudit = runTenantWideSodAudit;
const db_1 = require("@dos/db");
const sod_engine_1 = require("./sod-engine");
const publish_with_dsoc_1 = require("../events/publish-with-dsoc");
const resilience_1 = require("@dos/platform-core/resilience");
async function detectConflictsForUser(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows: roleRows } = await (0, db_1.safeQuery)(`SELECT DISTINCT role_code FROM "${schema}".enterprise_user_role_assignments
     WHERE user_id = $1 AND is_active = TRUE AND (valid_to IS NULL OR valid_to > NOW())`, [userId]);
    const roleCodes = roleRows.map((r) => r.role_code);
    const result = await (0, sod_engine_1.evaluateSod)(tenantId, roleCodes);
    const conflicts = result.violations.map((v, idx) => ({
        conflictId: `${userId}:${v.roleA}:${v.roleB}:${idx}`,
        userId,
        ruleCode: `${v.roleA}_${v.roleB}`,
        roleCodeA: v.roleA,
        roleCodeB: v.roleB,
        conflictLevel: v.conflictLevel,
        detectedAt: new Date().toISOString(),
        resolvedAt: null,
        resolution: null,
    }));
    if (conflicts.length > 0) {
        await (0, publish_with_dsoc_1.publish)('dauth.sod.conflicts_detected', tenantId, {
            userId,
            conflictCount: conflicts.length,
            detectedAt: new Date().toISOString(),
        }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    }
    return conflicts;
}
async function getUnresolvedConflicts(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT conflict_id, user_id, rule_code, role_code_a, role_code_b,
            conflict_level, detected_at, resolved_at, resolution
     FROM "${schema}".sod_conflict_log
     WHERE resolved_at IS NULL
     ORDER BY detected_at DESC`, []);
    return rows.map((r) => ({
        conflictId: r.conflict_id,
        userId: r.user_id,
        ruleCode: r.rule_code,
        roleCodeA: r.role_code_a,
        roleCodeB: r.role_code_b,
        conflictLevel: r.conflict_level,
        detectedAt: r.detected_at?.toISOString?.() ?? '',
        resolvedAt: null,
        resolution: null,
    }));
}
async function resolveConflict(tenantId, conflictId, resolution, resolvedBy) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`UPDATE "${schema}".sod_conflict_log
     SET resolved_at = NOW(), resolution = $1, resolved_by = $2
     WHERE conflict_id = $3`, [resolution, resolvedBy, conflictId]);
}
async function runTenantWideSodAudit(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT DISTINCT user_id FROM "${schema}".enterprise_user_role_assignments
     WHERE is_active = TRUE AND (valid_to IS NULL OR valid_to > NOW())`, []);
    let totalConflicts = 0;
    for (const row of rows) {
        const conflicts = await detectConflictsForUser(tenantId, row.user_id);
        totalConflicts += conflicts.length;
    }
    return totalConflicts;
}
//# sourceMappingURL=sod-conflict-audit.service.js.map
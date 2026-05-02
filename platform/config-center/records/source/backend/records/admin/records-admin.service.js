"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminSummary = getAdminSummary;
exports.listStuckRecords = listStuckRecords;
exports.forceReleaseHold = forceReleaseHold;
exports.bulkOverrideStatus = bulkOverrideStatus;
exports.purgeDisposedRecords = purgeDisposedRecords;
exports.getRetentionPolicyAdminList = getRetentionPolicyAdminList;
exports.toggleRetentionPolicy = toggleRetentionPolicy;
const database_port_1 = require("../ports/database.port");
const db_1 = require("@dos/db");
const records_event_service_1 = require("../services/records-event.service");
const crypto_1 = require("crypto");
async function getAdminSummary(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const totalResult = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total FROM "${schema}".records WHERE deleted_at IS NULL`);
    const totalRecords = (0, db_1.getFirstRow)(totalResult)?.total ?? 0;
    const byStatusResult = await (0, database_port_1.safeQuery)(`SELECT status, COUNT(*)::int AS cnt FROM "${schema}".records WHERE deleted_at IS NULL GROUP BY status`);
    const byStatus = {};
    for (const row of byStatusResult.rows ?? []) {
        byStatus[row.status] = row.cnt;
    }
    const stuckDisposalResult = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total FROM "${schema}".records
     WHERE deleted_at IS NULL AND status = 'disposal_pending'
       AND updated_at < NOW() - INTERVAL '14 days'`);
    const stuckDisposalPendingCount = (0, db_1.getFirstRow)(stuckDisposalResult)?.total ?? 0;
    const holdResult = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total FROM "${schema}".records WHERE deleted_at IS NULL AND status = 'hold'`);
    const recordsOnHoldCount = (0, db_1.getFirstRow)(holdResult)?.total ?? 0;
    let orphanedRecordsCount = 0;
    try {
        const orphanResult = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total FROM "${schema}".records r
       WHERE r.deleted_at IS NULL
         AND r.source_id IS NOT NULL
         AND r.source_module IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".record_lifecycle_history h WHERE h.record_id = r.record_id
         )
         AND r.status = 'active'
         AND r.created_at < NOW() - INTERVAL '30 days'`);
        orphanedRecordsCount = (0, db_1.getFirstRow)(orphanResult)?.total ?? 0;
    }
    catch {
        orphanedRecordsCount = 0;
    }
    return {
        tenantId,
        generatedAt: new Date().toISOString(),
        totalRecords,
        byStatus,
        stuckDisposalPendingCount,
        recordsOnHoldCount,
        orphanedRecordsCount,
    };
}
async function listStuckRecords(tenantId, status, olderThanDays = 14) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT
       r.record_id,
       r.title,
       r.status,
       EXTRACT(EPOCH FROM (NOW() - r.updated_at)) / 86400 AS stuck_days,
       EXISTS (
         SELECT 1 FROM "${schema}".record_holds h WHERE h.record_id = r.record_id AND h.released_at IS NULL
       ) AS has_legal_hold
     FROM "${schema}".records r
     WHERE r.deleted_at IS NULL
       AND r.status = $1
       AND r.updated_at < NOW() - ($2 || ' days')::interval
     ORDER BY r.updated_at ASC
     LIMIT 200`, [status, String(olderThanDays)]);
    return (result.rows ?? []).map((r) => ({
        recordId: r.record_id,
        title: r.title,
        status: r.status,
        stuckSinceDays: Math.round(r.stuck_days),
        hasActiveWorkflow: false,
        hasLegalHold: r.has_legal_hold,
    }));
}
async function forceReleaseHold(tenantId, recordId, actorId, reason) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    await (0, database_port_1.safeQuery)(`UPDATE "${schema}".record_holds
     SET released_at = NOW(), released_by = $1, release_reason = $2
     WHERE record_id = $3 AND released_at IS NULL`, [actorId, reason, recordId]);
    await (0, database_port_1.safeQuery)(`UPDATE "${schema}".records
     SET status = 'active', updated_at = NOW(), updated_by = $1
     WHERE record_id = $2 AND deleted_at IS NULL AND status = 'hold'`, [actorId, recordId]);
    (0, records_event_service_1.emitRecordsEvent)({
        tenantId,
        entityType: 'record',
        entityId: recordId,
        action: 'legal_hold_released',
        triggeredBy: actorId,
        previousState: 'hold',
        newState: 'active',
        correlationId: (0, crypto_1.randomUUID)(),
        data: { adminOverride: true, reason },
    });
    return { released: true, recordId };
}
async function bulkOverrideStatus(tenantId, recordIds, targetStatus, actorId, reason) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const updated = [];
    const failed = [];
    for (const recordId of recordIds) {
        try {
            const current = await (0, database_port_1.safeQuery)(`SELECT record_id, status FROM "${schema}".records WHERE record_id = $1 AND deleted_at IS NULL`, [recordId]);
            const row = (0, db_1.getFirstRow)(current);
            if (!row) {
                failed.push(recordId);
                continue;
            }
            const prevStatus = row.status;
            await (0, database_port_1.safeQuery)(`UPDATE "${schema}".records SET status = $1, updated_at = NOW(), updated_by = $2 WHERE record_id = $3 AND deleted_at IS NULL`, [targetStatus, actorId, recordId]);
            const historyId = (0, crypto_1.randomUUID)();
            await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".record_lifecycle_history
           (history_id, record_id, previous_status, new_status, action, transitioned_by, reason, workflow_instance_id, transitioned_at)
         VALUES ($1, $2, $3, $4, 'admin_override', $5, $6, NULL, NOW())`, [historyId, recordId, prevStatus, targetStatus, actorId, reason]);
            (0, records_event_service_1.emitRecordsEvent)({
                tenantId,
                entityType: 'record',
                entityId: recordId,
                action: 'status_changed',
                triggeredBy: actorId,
                previousState: prevStatus,
                newState: targetStatus,
                correlationId: (0, crypto_1.randomUUID)(),
                data: { adminOverride: true, reason },
            });
            updated.push(recordId);
        }
        catch {
            failed.push(recordId);
        }
    }
    return { updated: updated.length, failed: failed.length, recordIds: updated };
}
async function purgeDisposedRecords(tenantId, actorId, olderThanDays = 365) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const eligible = await (0, database_port_1.safeQuery)(`SELECT record_id FROM "${schema}".records
     WHERE deleted_at IS NULL
       AND status = 'disposed'
       AND updated_at < NOW() - ($1 || ' days')::interval`, [String(olderThanDays)]);
    const ids = (eligible.rows ?? []).map((r) => r.record_id);
    if (ids.length === 0)
        return { purged: 0 };
    const now = new Date().toISOString();
    for (const id of ids) {
        await (0, database_port_1.safeQuery)(`UPDATE "${schema}".records SET deleted_at = $1, updated_by = $2 WHERE record_id = $3`, [now, actorId, id]);
        (0, records_event_service_1.emitRecordsEvent)({
            tenantId,
            entityType: 'record',
            entityId: id,
            action: 'deleted',
            triggeredBy: actorId,
            correlationId: (0, crypto_1.randomUUID)(),
            data: { adminPurge: true, olderThanDays },
        });
    }
    return { purged: ids.length };
}
async function getRetentionPolicyAdminList(tenantId, includeInactive = false) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const whereClause = includeInactive ? '' : `WHERE is_active = true`;
    const result = await (0, database_port_1.safeQuery)(`SELECT policy_id, name, record_type, retention_days, is_active, created_at
     FROM "${schema}".record_retention_policies
     ${whereClause}
     ORDER BY record_type, name`);
    return (result.rows ?? []).map((r) => ({
        policyId: r.policy_id,
        name: r.name,
        recordType: r.record_type,
        retentionDays: r.retention_days,
        isActive: r.is_active,
        createdAt: r.created_at,
    }));
}
async function toggleRetentionPolicy(tenantId, policyId, activate, actorId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    await (0, database_port_1.safeQuery)(`UPDATE "${schema}".record_retention_policies
     SET is_active = $1, updated_at = NOW()
     WHERE policy_id = $2`, [activate, policyId]);
    (0, records_event_service_1.emitRecordsEvent)({
        tenantId,
        entityType: 'retention_policy',
        entityId: policyId,
        action: 'updated',
        triggeredBy: actorId,
        correlationId: (0, crypto_1.randomUUID)(),
        data: { isActive: activate },
    });
    return { policyId, isActive: activate };
}
//# sourceMappingURL=records-admin.service.js.map
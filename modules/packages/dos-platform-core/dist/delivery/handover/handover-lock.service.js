"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHandoverLock = createHandoverLock;
exports.updateHandoverChecklist = updateHandoverChecklist;
exports.lockHandover = lockHandover;
exports.validateHandoverReadiness = validateHandoverReadiness;
exports.getHandoverLock = getHandoverLock;
exports.getHandoverLockByRelease = getHandoverLockByRelease;
exports.registerRiskItem = registerRiskItem;
exports.getRiskItem = getRiskItem;
exports.listRisksByRelease = listRisksByRelease;
exports.listCarryForwardRisks = listCarryForwardRisks;
const db_1 = require("@dos/db");
const events_1 = require("../../events");
const uuid_1 = require("uuid");
async function createHandoverLock(input) {
    const lockId = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`INSERT INTO public.dos_handover_locks (
      lock_id, release_id,
      as_built_updated, migrations_verified, release_notes_finalized,
      known_risks_updated, operational_dashboards_confirmed,
      support_owner_confirmed, cutover_outcome, rollback_outcome,
      locked_at, locked_by, created_at
    ) VALUES ($1,$2,false,false,false,false,false,false,NULL,NULL,NULL,NULL,$3)`, [lockId, input.releaseId, now]);
    return getHandoverLock(lockId);
}
async function updateHandoverChecklist(lockId, updates) {
    const fields = [];
    const values = [];
    let idx = 1;
    if (updates.asBuiltUpdated !== undefined) {
        fields.push(`as_built_updated = $${idx++}`);
        values.push(updates.asBuiltUpdated);
    }
    if (updates.migrationsVerified !== undefined) {
        fields.push(`migrations_verified = $${idx++}`);
        values.push(updates.migrationsVerified);
    }
    if (updates.releaseNotesFinalized !== undefined) {
        fields.push(`release_notes_finalized = $${idx++}`);
        values.push(updates.releaseNotesFinalized);
    }
    if (updates.knownRisksUpdated !== undefined) {
        fields.push(`known_risks_updated = $${idx++}`);
        values.push(updates.knownRisksUpdated);
    }
    if (updates.operationalDashboardsConfirmed !== undefined) {
        fields.push(`operational_dashboards_confirmed = $${idx++}`);
        values.push(updates.operationalDashboardsConfirmed);
    }
    if (updates.supportOwnerConfirmed !== undefined) {
        fields.push(`support_owner_confirmed = $${idx++}`);
        values.push(updates.supportOwnerConfirmed);
    }
    if (updates.cutoverOutcome !== undefined) {
        fields.push(`cutover_outcome = $${idx++}`);
        values.push(updates.cutoverOutcome);
    }
    if (updates.rollbackOutcome !== undefined) {
        fields.push(`rollback_outcome = $${idx++}`);
        values.push(updates.rollbackOutcome);
    }
    if (fields.length === 0)
        return getHandoverLock(lockId);
    values.push(lockId);
    await (0, db_1.safeQuery)(`UPDATE public.dos_handover_locks SET ${fields.join(', ')} WHERE lock_id = $${idx}`, values);
    return getHandoverLock(lockId);
}
async function lockHandover(lockId, lockedBy) {
    const lock = await getHandoverLock(lockId);
    if (!lock)
        return null;
    const issues = validateHandoverReadiness(lock);
    if (issues.length > 0) {
        throw new Error(`Handover lock blocked: ${issues.join('; ')}`);
    }
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`UPDATE public.dos_handover_locks SET locked_at = $1, locked_by = $2 WHERE lock_id = $3`, [now, lockedBy, lockId]);
    const updated = await getHandoverLock(lockId);
    if (updated) {
        await (0, events_1.publish)('delivery.handover.locked', 'platform', {
            lockId,
            releaseId: updated.releaseId,
            lockedBy,
        }, {});
    }
    return updated;
}
function validateHandoverReadiness(lock) {
    const issues = [];
    if (!lock.asBuiltUpdated)
        issues.push('As-built record must be updated');
    if (!lock.migrationsVerified)
        issues.push('Migrations must be verified');
    if (!lock.releaseNotesFinalized)
        issues.push('Release notes must be finalized');
    if (!lock.knownRisksUpdated)
        issues.push('Known risk register must be updated');
    if (!lock.operationalDashboardsConfirmed)
        issues.push('Operational dashboards must be confirmed');
    if (!lock.supportOwnerConfirmed)
        issues.push('Support owner must be confirmed');
    return issues;
}
async function getHandoverLock(lockId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_handover_locks WHERE lock_id = $1 LIMIT 1`, [lockId]);
    if (!result.rows[0])
        return null;
    return mapLockRow(result.rows[0]);
}
async function getHandoverLockByRelease(releaseId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_handover_locks WHERE release_id = $1 ORDER BY created_at DESC LIMIT 1`, [releaseId]);
    if (!result.rows[0])
        return null;
    return mapLockRow(result.rows[0]);
}
async function registerRiskItem(input) {
    const riskId = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`INSERT INTO public.dos_handover_risks (
      risk_id, release_id, description, severity, owner,
      mitigation_notes, carry_forward, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [
        riskId,
        input.releaseId,
        input.description,
        input.severity,
        input.owner,
        input.mitigationNotes ?? null,
        input.carryForward ?? false,
        now,
    ]);
    return getRiskItem(riskId);
}
async function getRiskItem(riskId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_handover_risks WHERE risk_id = $1 LIMIT 1`, [riskId]);
    if (!result.rows[0])
        return null;
    return mapRiskRow(result.rows[0]);
}
async function listRisksByRelease(releaseId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_handover_risks WHERE release_id = $1 ORDER BY severity DESC, created_at`, [releaseId]);
    return result.rows.map(mapRiskRow);
}
async function listCarryForwardRisks() {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_handover_risks WHERE carry_forward = true ORDER BY severity DESC, created_at`, []);
    return result.rows.map(mapRiskRow);
}
function mapLockRow(row) {
    return {
        lockId: row.lock_id,
        releaseId: row.release_id,
        asBuiltUpdated: row.as_built_updated,
        migrationsVerified: row.migrations_verified,
        releaseNotesFinalized: row.release_notes_finalized,
        knownRisksUpdated: row.known_risks_updated,
        operationalDashboardsConfirmed: row.operational_dashboards_confirmed,
        supportOwnerConfirmed: row.support_owner_confirmed,
        cutoverOutcome: row.cutover_outcome ?? null,
        rollbackOutcome: row.rollback_outcome ?? null,
        lockedAt: row.locked_at ?? null,
        lockedBy: row.locked_by ?? null,
    };
}
function mapRiskRow(row) {
    return {
        riskId: row.risk_id,
        releaseId: row.release_id,
        description: row.description,
        severity: row.severity,
        owner: row.owner,
        mitigationNotes: row.mitigation_notes ?? null,
        carryForward: row.carry_forward,
        createdAt: row.created_at,
    };
}
//# sourceMappingURL=handover-lock.service.js.map
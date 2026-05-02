"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCompatibilityRecord = registerCompatibilityRecord;
exports.verifyCompatibilityRecord = verifyCompatibilityRecord;
exports.getCompatibilityRecord = getCompatibilityRecord;
exports.listCompatibilityByRelease = listCompatibilityByRelease;
exports.listBreakingChanges = listBreakingChanges;
exports.validateBreakingChanges = validateBreakingChanges;
const db_1 = require("@dos/db");
const events_1 = require("../../events");
const uuid_1 = require("uuid");
async function registerCompatibilityRecord(input) {
    const compatibilityId = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`INSERT INTO public.dos_compatibility_records (
      compatibility_id, release_id, artifact_type, artifact_code,
      change_class, impact, affected_consumers,
      migration_required, deprecation_notice_required,
      breaking_change_approval_id, notes, verified_at, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NULL,$12)`, [
        compatibilityId,
        input.releaseId,
        input.artifactType,
        input.artifactCode,
        input.changeClass,
        input.impact,
        JSON.stringify(input.affectedConsumers ?? []),
        input.migrationRequired ?? false,
        input.deprecationNoticeRequired ?? false,
        input.breakingChangeApprovalId ?? null,
        input.notes ?? null,
        now,
    ]);
    return getCompatibilityRecord(compatibilityId);
}
async function verifyCompatibilityRecord(compatibilityId, verifiedBy) {
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`UPDATE public.dos_compatibility_records SET verified_at = $1, notes = COALESCE(notes, '') || ' Verified by: ' || $2 WHERE compatibility_id = $3`, [now, verifiedBy, compatibilityId]);
    await (0, events_1.publish)('delivery.compatibility.verified', 'platform', { compatibilityId, verifiedBy }, {});
}
async function getCompatibilityRecord(compatibilityId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_compatibility_records WHERE compatibility_id = $1 LIMIT 1`, [compatibilityId]);
    if (!result.rows[0])
        return null;
    return mapCompatibilityRow(result.rows[0]);
}
async function listCompatibilityByRelease(releaseId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_compatibility_records WHERE release_id = $1 ORDER BY created_at`, [releaseId]);
    return result.rows.map(mapCompatibilityRow);
}
async function listBreakingChanges(releaseId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_compatibility_records WHERE release_id = $1 AND change_class = 'breaking' ORDER BY created_at`, [releaseId]);
    return result.rows.map(mapCompatibilityRow);
}
async function validateBreakingChanges(releaseId, 
// Injectable dependency so tests can stub the DB layer without
// module-level vi.mock hacks (which don't reach internal callers).
// Defaults to the DB-backed listBreakingChanges.
listFn = listBreakingChanges) {
    const breaking = await listFn(releaseId);
    const issues = [];
    for (const record of breaking) {
        if (!record.breakingChangeApprovalId) {
            issues.push(`Breaking change on ${record.artifactCode} (${record.artifactType}) requires approval`);
        }
        if (record.migrationRequired && !record.verifiedAt) {
            issues.push(`Breaking change on ${record.artifactCode} requires migration verification`);
        }
    }
    return issues;
}
function mapCompatibilityRow(row) {
    return {
        compatibilityId: row.compatibility_id,
        releaseId: row.release_id,
        artifactType: row.artifact_type,
        artifactCode: row.artifact_code,
        changeClass: row.change_class,
        impact: row.impact,
        affectedConsumers: row.affected_consumers ?? [],
        migrationRequired: row.migration_required,
        deprecationNoticeRequired: row.deprecation_notice_required,
        breakingChangeApprovalId: row.breaking_change_approval_id ?? null,
        notes: row.notes ?? null,
        verifiedAt: row.verified_at ?? null,
        createdAt: row.created_at,
    };
}
//# sourceMappingURL=compatibility.service.js.map
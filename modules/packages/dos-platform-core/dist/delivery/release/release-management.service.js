"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRelease = createRelease;
exports.getRelease = getRelease;
exports.getReleaseByCode = getReleaseByCode;
exports.listReleases = listReleases;
exports.advanceReleaseStatus = advanceReleaseStatus;
exports.recordApproval = recordApproval;
exports.attachRollbackPlan = attachRollbackPlan;
exports.cancelRelease = cancelRelease;
exports.isReleaseApproved = isReleaseApproved;
const db_1 = require("@dos/db");
const events_1 = require("../../events");
const uuid_1 = require("uuid");
async function createRelease(input) {
    const releaseId = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`INSERT INTO public.dos_releases (
      release_id, release_code, version, risk_class, status,
      affected_layers, affected_products, affected_modules, migrations,
      approvals_required, approvals_met, rollback_plan_id, smoke_test_inventory,
      support_owner, cutover_window_start, cutover_window_end, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,'draft',$5,$6,$7,$8,$9,'{}',NULL,$10,$11,$12,$13,$14,$15)`, [
        releaseId,
        input.releaseCode,
        input.version,
        input.riskClass,
        JSON.stringify(input.affectedLayers),
        JSON.stringify(input.affectedProducts),
        JSON.stringify(input.affectedModules),
        JSON.stringify(input.migrations),
        JSON.stringify(input.approvalsRequired),
        JSON.stringify(input.smokeTestInventory),
        input.supportOwner ?? null,
        input.cutoverWindowStart ?? null,
        input.cutoverWindowEnd ?? null,
        now,
        now,
    ]);
    await (0, events_1.publish)('delivery.release.created', 'platform', { releaseId, releaseCode: input.releaseCode, version: input.version }, {});
    return getRelease(releaseId);
}
async function getRelease(releaseId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_releases WHERE release_id = $1 LIMIT 1`, [releaseId]);
    if (!result.rows[0])
        return null;
    return mapReleaseRow(result.rows[0]);
}
async function getReleaseByCode(releaseCode) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_releases WHERE release_code = $1 LIMIT 1`, [releaseCode]);
    if (!result.rows[0])
        return null;
    return mapReleaseRow(result.rows[0]);
}
async function listReleases(status) {
    const result = status
        ? await (0, db_1.safeQuery)(`SELECT * FROM public.dos_releases WHERE status = $1 ORDER BY created_at DESC`, [status])
        : await (0, db_1.safeQuery)(`SELECT * FROM public.dos_releases ORDER BY created_at DESC`, []);
    return result.rows.map(mapReleaseRow);
}
async function advanceReleaseStatus(releaseId, newStatus, actorId) {
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`UPDATE public.dos_releases SET status = $1, updated_at = $2 WHERE release_id = $3`, [newStatus, now, releaseId]);
    await (0, events_1.publish)('delivery.release.status_changed', 'platform', { releaseId, newStatus, actorId }, {});
    return getRelease(releaseId);
}
async function recordApproval(releaseId, approverId) {
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`UPDATE public.dos_releases
     SET approvals_met = approvals_met || $1::jsonb, updated_at = $2
     WHERE release_id = $3`, [JSON.stringify([approverId]), now, releaseId]);
    await (0, events_1.publish)('delivery.release.approval_recorded', 'platform', { releaseId, approverId }, {});
}
async function attachRollbackPlan(releaseId, rollbackPlanId) {
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`UPDATE public.dos_releases SET rollback_plan_id = $1, updated_at = $2 WHERE release_id = $3`, [rollbackPlanId, now, releaseId]);
}
async function cancelRelease(releaseId, actorId) {
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`UPDATE public.dos_releases SET status = 'cancelled', updated_at = $1 WHERE release_id = $2`, [now, releaseId]);
    await (0, events_1.publish)('delivery.release.cancelled', 'platform', { releaseId, actorId }, {});
}
async function isReleaseApproved(releaseId) {
    const release = await getRelease(releaseId);
    if (!release)
        return false;
    const met = new Set(release.approvalsMet);
    return release.approvalsRequired.every((a) => met.has(a));
}
function mapReleaseRow(row) {
    return {
        releaseId: row.release_id,
        releaseCode: row.release_code,
        version: row.version,
        riskClass: row.risk_class,
        status: row.status,
        affectedLayers: row.affected_layers ?? [],
        affectedProducts: row.affected_products ?? [],
        affectedModules: row.affected_modules ?? [],
        migrations: row.migrations ?? [],
        approvalsRequired: row.approvals_required ?? [],
        approvalsMet: row.approvals_met ?? [],
        rollbackPlanId: row.rollback_plan_id ?? null,
        smokeTestInventory: row.smoke_test_inventory ?? [],
        supportOwner: row.support_owner ?? null,
        cutoverWindowStart: row.cutover_window_start ?? null,
        cutoverWindowEnd: row.cutover_window_end ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
//# sourceMappingURL=release-management.service.js.map
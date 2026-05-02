"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDeliveryDiagnosticsReport = generateDeliveryDiagnosticsReport;
exports.checkReleaseReadiness = checkReleaseReadiness;
const db_1 = require("@dos/db");
async function generateDeliveryDiagnosticsReport() {
    const [failedDeployments, stuckMigrations, irreversibleMigrationsWithoutApproval, releasesWithMissingApprovals] = await Promise.all([
        getFailedDeploymentsSummary(),
        getStuckMigrations(),
        getIrreversibleMigrationsWithoutApproval(),
        getReleasesWithMissingApprovals(),
    ]);
    return {
        generatedAt: new Date().toISOString(),
        failedDeployments,
        stuckMigrations,
        recentRollbacks: await getRecentRollbacks(),
        releasesWithMissingApprovals,
        irreversibleMigrationsWithoutApproval,
    };
}
async function getFailedDeploymentsSummary() {
    const result = await (0, db_1.safeQuery)(`SELECT d.* FROM public.dos_releases r
     JOIN LATERAL (
       SELECT * FROM public.dos_tenant_list() t
     ) tenants ON TRUE
     LIMIT 0`, []).catch(() => ({ rows: [] }));
    return result.rows;
}
async function getStuckMigrations() {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_migrations
     WHERE status = 'running'
       AND started_at < NOW() - INTERVAL '30 minutes'
     ORDER BY started_at`, []);
    return result.rows.map(mapMigrationRow);
}
async function getIrreversibleMigrationsWithoutApproval() {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_migrations
     WHERE reversible = FALSE AND irreversible_approval_id IS NULL
     ORDER BY created_at DESC`, []);
    return result.rows.map(mapMigrationRow);
}
async function getReleasesWithMissingApprovals() {
    const result = await (0, db_1.safeQuery)(`SELECT release_id, release_code, approvals_required, approvals_met
     FROM public.dos_releases
     WHERE status NOT IN ('released','rolled_back','cancelled')
       AND approvals_required != '[]'::jsonb`, []);
    return result.rows
        .map((row) => {
        const required = row.approvals_required ?? [];
        const met = new Set(row.approvals_met ?? []);
        const missing = required.filter((a) => !met.has(a));
        return { releaseId: row.release_id, releaseCode: row.release_code, missing };
    })
        .filter((r) => r.missing.length > 0);
}
async function getRecentRollbacks() {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_migrations LIMIT 0`, []).catch(() => ({ rows: [] }));
    return result.rows;
}
async function checkReleaseReadiness(releaseId) {
    const blockers = [];
    const releaseResult = await (0, db_1.safeQuery)(`SELECT status, approvals_required, approvals_met, rollback_plan_id
     FROM public.dos_releases WHERE release_id = $1 LIMIT 1`, [releaseId]);
    if (!releaseResult.rows[0]) {
        return { ready: false, blockers: ['Release not found'] };
    }
    const row = releaseResult.rows[0];
    const required = row.approvals_required ?? [];
    const met = new Set(row.approvals_met ?? []);
    const missingApprovals = required.filter((a) => !met.has(a));
    if (missingApprovals.length > 0) {
        blockers.push(`Missing approvals: ${missingApprovals.join(', ')}`);
    }
    if (!row.rollback_plan_id) {
        blockers.push('Rollback plan not attached');
    }
    const migResult = await (0, db_1.safeQuery)(`SELECT COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
            COUNT(*) FILTER (WHERE reversible = FALSE AND irreversible_approval_id IS NULL) AS unapproved_irreversible
     FROM public.dos_migrations WHERE release_id = $1`, [releaseId]);
    const mr = migResult.rows[0];
    if (Number(mr?.failed_count ?? 0) > 0) {
        blockers.push('Release has failed migrations');
    }
    if (Number(mr?.unapproved_irreversible ?? 0) > 0) {
        blockers.push('Release has irreversible migrations without approval');
    }
    return { ready: blockers.length === 0, blockers };
}
function mapMigrationRow(row) {
    return {
        migrationId: row.migration_id,
        releaseId: row.release_id ?? null,
        migrationType: row.migration_type,
        status: row.status,
        reversible: row.reversible,
        compatibilityImpact: row.compatibility_impact,
        affectedSchemas: row.affected_schemas ?? [],
        affectedTables: row.affected_tables ?? [],
        validationSteps: row.validation_steps ?? [],
        rollbackNotes: row.rollback_notes ?? null,
        tenantImpact: row.tenant_impact ?? null,
        irreversibleApprovalId: row.irreversible_approval_id ?? null,
        tenantId: row.tenant_id ?? null,
        startedAt: row.started_at ?? null,
        completedAt: row.completed_at ?? null,
        failedAt: row.failed_at ?? null,
        failureReason: row.failure_reason ?? null,
        createdAt: row.created_at,
    };
}
//# sourceMappingURL=delivery-diagnostics.service.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMigration = registerMigration;
exports.startMigration = startMigration;
exports.completeMigration = completeMigration;
exports.failMigration = failMigration;
exports.skipMigration = skipMigration;
exports.getMigration = getMigration;
exports.listMigrationsByRelease = listMigrationsByRelease;
exports.listPendingMigrations = listPendingMigrations;
exports.listFailedMigrations = listFailedMigrations;
exports.validateMigrationSafety = validateMigrationSafety;
const db_1 = require("@dos/db");
const events_1 = require("../../events");
const uuid_1 = require("uuid");
async function registerMigration(input) {
    const migrationId = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`INSERT INTO public.dos_migrations (
      migration_id, release_id, migration_type, status, reversible,
      compatibility_impact, affected_schemas, affected_tables,
      validation_steps, rollback_notes, tenant_impact,
      irreversible_approval_id, tenant_id,
      started_at, completed_at, failed_at, failure_reason, created_at
    ) VALUES ($1,$2,$3,'pending',$4,$5,$6,$7,$8,$9,$10,$11,$12,NULL,NULL,NULL,NULL,$13)`, [
        migrationId,
        input.releaseId ?? null,
        input.migrationType,
        input.reversible,
        input.compatibilityImpact,
        JSON.stringify(input.affectedSchemas ?? []),
        JSON.stringify(input.affectedTables ?? []),
        JSON.stringify(input.validationSteps ?? []),
        input.rollbackNotes ?? null,
        input.tenantImpact ?? null,
        input.irreversibleApprovalId ?? null,
        input.tenantId ?? null,
        now,
    ]);
    await (0, events_1.publish)('delivery.migration.registered', input.tenantId ?? 'platform', { migrationId, migrationType: input.migrationType }, {});
    return getMigration(migrationId);
}
async function startMigration(migrationId) {
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`UPDATE public.dos_migrations SET status = 'running', started_at = $1 WHERE migration_id = $2`, [now, migrationId]);
    const migration = await getMigration(migrationId);
    await (0, events_1.publish)('delivery.migration.started', migration?.tenantId ?? 'platform', { migrationId }, {});
}
async function completeMigration(migrationId) {
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`UPDATE public.dos_migrations SET status = 'completed', completed_at = $1 WHERE migration_id = $2`, [now, migrationId]);
    const migration = await getMigration(migrationId);
    await (0, events_1.publish)('delivery.migration.completed', migration?.tenantId ?? 'platform', { migrationId }, {});
}
async function failMigration(migrationId, reason) {
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`UPDATE public.dos_migrations SET status = 'failed', failed_at = $1, failure_reason = $2 WHERE migration_id = $3`, [now, reason, migrationId]);
    const migration = await getMigration(migrationId);
    await (0, events_1.publish)('delivery.migration.failed', migration?.tenantId ?? 'platform', { migrationId, reason }, {});
}
async function skipMigration(migrationId) {
    await (0, db_1.safeQuery)(`UPDATE public.dos_migrations SET status = 'skipped' WHERE migration_id = $1`, [migrationId]);
}
async function getMigration(migrationId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_migrations WHERE migration_id = $1 LIMIT 1`, [migrationId]);
    if (!result.rows[0])
        return null;
    return mapMigrationRow(result.rows[0]);
}
async function listMigrationsByRelease(releaseId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_migrations WHERE release_id = $1 ORDER BY created_at`, [releaseId]);
    return result.rows.map(mapMigrationRow);
}
async function listPendingMigrations(tenantId) {
    const result = tenantId
        ? await (0, db_1.safeQuery)(`SELECT * FROM public.dos_migrations WHERE status IN ('pending','running') AND tenant_id = $1 ORDER BY created_at`, [tenantId])
        : await (0, db_1.safeQuery)(`SELECT * FROM public.dos_migrations WHERE status IN ('pending','running') ORDER BY created_at`, []);
    return result.rows.map(mapMigrationRow);
}
async function listFailedMigrations() {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_migrations WHERE status = 'failed' ORDER BY failed_at DESC`, []);
    return result.rows.map(mapMigrationRow);
}
function validateMigrationSafety(migration) {
    const issues = [];
    if (!migration.reversible && !migration.irreversibleApprovalId) {
        issues.push('Irreversible migration requires approval ID');
    }
    if (migration.compatibilityImpact === 'high' && !migration.rollbackNotes) {
        issues.push('High compatibility impact migration requires rollback notes');
    }
    if (migration.validationSteps.length === 0) {
        issues.push('Migration must define at least one validation step');
    }
    return issues;
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
//# sourceMappingURL=migration-tracking.service.js.map
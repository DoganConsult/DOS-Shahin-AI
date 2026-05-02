"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverTenantMigrations = discoverTenantMigrations;
exports.runTenantMigrationsTracked = runTenantMigrationsTracked;
exports.backfillTrackerByExistence = backfillTrackerByExistence;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
const query_1 = require("./query");
const tenant_1 = require("./tenant");
const logger_1 = require("./logger");
const errors_1 = require("./errors");
const SCHEMA_PLACEHOLDER = /__TENANT_SCHEMA__/g;
const QUOTED_SCHEMA_PLACEHOLDER = /"__TENANT_SCHEMA__"/g;
// Substitute the placeholder. Many migration files already wrap the
// placeholder in double quotes ("__TENANT_SCHEMA__"); blindly re-quoting
// the bare form would yield ""tenant_xxx"" — a zero-length identifier
// followed by an unquoted name. Replace the quoted form first with the
// quoted schema, then any remaining bare occurrences with the quoted
// schema, so all rendered identifiers are exactly "tenant_xxx".
function substitutePlaceholder(sql, schema) {
    const quoted = `"${schema}"`;
    return sql.replace(QUOTED_SCHEMA_PLACEHOLDER, quoted).replace(SCHEMA_PLACEHOLDER, quoted);
}
function scanModuleDir(modulesDir, mod, subPath, kind, seenIds, out, logger) {
    const dir = (0, path_1.join)(modulesDir, mod, subPath);
    const exists = (0, fs_1.existsSync)(dir) && (0, fs_1.statSync)(dir).isDirectory();
    const scan = { kind, path: dir, mod, exists, found: 0 };
    if (!exists)
        return scan;
    // Locked exclusions — see ops/sql/sql-ownership.registry.yml runnersMustNotScan.
    // The runner must NEVER scan canonical/proposals/frozen/fixtures/tests/__tests__
    // directories even if modulesDir is rerooted by an operator.
    if (/[\\/](canonical|_frozen|proposals|fixtures|tests|__tests__)([\\/]|$)/i.test(dir)) {
        scan.found = 0;
        return scan;
    }
    const files = (0, fs_1.readdirSync)(dir)
        .filter((f) => f.endsWith('.sql') && !f.includes('_down') && !/_frozen/i.test(f))
        .sort();
    for (const f of files) {
        const migrationId = `module/${mod}/${(0, path_1.basename)(f, '.sql')}`;
        if (seenIds.has(migrationId)) {
            logger.warn({ mod, filename: f, migrationId, droppedPath: dir }, '[tenant-migrations] duplicate migrationId — canonical path wins, legacy copy ignored');
            continue;
        }
        seenIds.add(migrationId);
        const abs = (0, path_1.join)(dir, f);
        out.push({
            migrationId,
            source: `module/${mod}`,
            filename: f,
            absolutePath: abs,
            rawSql: (0, fs_1.readFileSync)(abs, 'utf-8'),
        });
        scan.found++;
    }
    return scan;
}
function discoverTenantMigrations(opts = {}) {
    const cwd = process.cwd();
    const opsTenantDir = opts.opsTenantDir ?? (0, path_1.join)(cwd, 'ops/migrations/tenant');
    const modulesDir = opts.modulesDir ?? (0, path_1.join)(cwd, 'modules');
    const logger = (0, logger_1.getDbLogger)();
    const out = [];
    const seenIds = new Set();
    const scans = [];
    // 1. Inline baselines (in-memory; always first)
    for (const b of opts.inlineBaselines ?? []) {
        if (seenIds.has(b.migrationId))
            continue;
        seenIds.add(b.migrationId);
        out.push({
            migrationId: b.migrationId,
            source: 'inline-baseline',
            filename: b.filename,
            absolutePath: `<inline:${b.filename}>`,
            rawSql: b.rawSql,
        });
    }
    // 2 + 3. Per-module scans: canonical first (wins on collision), then legacy.
    if ((0, fs_1.existsSync)(modulesDir)) {
        const modules = (0, fs_1.readdirSync)(modulesDir, { withFileTypes: true })
            .filter((d) => d.isDirectory())
            .map((d) => d.name)
            .sort();
        for (const mod of modules) {
            scans.push(scanModuleDir(modulesDir, mod, 'db/tenant/migrations', 'module-canonical', seenIds, out, logger));
            scans.push(scanModuleDir(modulesDir, mod, `source/backend/${mod}/migrations`, 'module-legacy', seenIds, out, logger));
        }
    }
    // 4. Legacy central tenant migrations: ops/migrations/tenant/*.sql
    const opsScan = { kind: 'ops-legacy', path: opsTenantDir, exists: false, found: 0 };
    if ((0, fs_1.existsSync)(opsTenantDir) && (0, fs_1.statSync)(opsTenantDir).isDirectory()) {
        opsScan.exists = true;
        const files = (0, fs_1.readdirSync)(opsTenantDir)
            .filter((f) => f.endsWith('.sql') && !f.includes('_down'))
            .sort();
        for (const f of files) {
            const migrationId = `ops/tenant/${(0, path_1.basename)(f, '.sql')}`;
            if (seenIds.has(migrationId))
                continue;
            seenIds.add(migrationId);
            const abs = (0, path_1.join)(opsTenantDir, f);
            out.push({
                migrationId,
                source: 'ops/tenant',
                filename: f,
                absolutePath: abs,
                rawSql: (0, fs_1.readFileSync)(abs, 'utf-8'),
            });
            opsScan.found++;
        }
    }
    scans.push(opsScan);
    // One structured discovery summary — roots found vs missing, per user's
    // F0.4 rule: never silently skip a migration root.
    const canonicalModules = scans.filter((s) => s.kind === 'module-canonical' && s.exists).length;
    const legacyModules = scans.filter((s) => s.kind === 'module-legacy' && s.exists).length;
    const canonicalFiles = scans.filter((s) => s.kind === 'module-canonical').reduce((n, s) => n + s.found, 0);
    const legacyFiles = scans.filter((s) => s.kind === 'module-legacy').reduce((n, s) => n + s.found, 0);
    const rootsMissing = scans
        .filter((s) => !s.exists)
        .map((s) => ({ kind: s.kind, path: s.path, mod: s.mod }))
        .slice(0, 20);
    logger.info({
        event: 'tenant-migrations.discovery',
        total: out.length,
        inlineBaselines: opts.inlineBaselines?.length ?? 0,
        canonicalModules,
        canonicalFiles,
        legacyModules,
        legacyFiles,
        opsLegacyExists: opsScan.exists,
        opsLegacyCount: opsScan.found,
        rootsMissingCount: scans.filter((s) => !s.exists).length,
        rootsMissing,
    }, '[tenant-migrations] discovery complete');
    if (opts.onlyMigrationIds && opts.onlyMigrationIds.length > 0) {
        const allow = new Set(opts.onlyMigrationIds);
        return out.filter((m) => allow.has(m.migrationId));
    }
    return out;
}
function checksumFor(substitutedSql) {
    return (0, crypto_1.createHash)('sha256').update(substitutedSql, 'utf8').digest('hex');
}
async function isAlreadyApplied(tenantId, migrationId, checksum) {
    const res = await (0, query_1.safeQuery)(`SELECT 1
       FROM dos.tenant_migrations
      WHERE tenant_id = $1
        AND migration_id = $2
        AND checksum = $3
        AND status IN ('applied','verified-by-backfill')
      LIMIT 1`, [tenantId, migrationId, checksum]);
    return res.rows.length > 0;
}
async function recordResult(tenantId, m, checksum, status, durationMs, errorMessage, appliedBy) {
    await (0, query_1.safeQuery)(`INSERT INTO dos.tenant_migrations
       (tenant_id, migration_id, source, filename, checksum, status, duration_ms, error_message, applied_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (tenant_id, migration_id, checksum) DO UPDATE
       SET status = EXCLUDED.status,
           duration_ms = EXCLUDED.duration_ms,
           error_message = EXCLUDED.error_message,
           applied_at = NOW(),
           applied_by = EXCLUDED.applied_by`, [tenantId, m.migrationId, m.source, m.filename, checksum, status, durationMs, errorMessage ?? null, appliedBy ?? null]);
}
async function runTenantMigrationsTracked(tenantId, options = {}) {
    (0, tenant_1.assertTenantId)(tenantId);
    const schema = (0, tenant_1.tenantSchema)(tenantId);
    const logger = (0, logger_1.getDbLogger)();
    const discovered = discoverTenantMigrations(options);
    const results = [];
    let applied = 0;
    let skipped = 0;
    let failed = 0;
    for (const m of discovered) {
        const substituted = substitutePlaceholder(m.rawSql, schema);
        // Guard: refuse to apply SQL that still contains the placeholder.
        // A stale dist/ of dos-db (or a regression in substitutePlaceholder)
        // would otherwise produce ""."tablename" → Postgres "zero-length
        // delimited identifier" → ghost-failed row in the ledger.
        if (substituted.includes('__TENANT_SCHEMA__')) {
            const err = new Error(`[tenant-migrations] placeholder substitution failed for ${m.migrationId} ` +
                `(tenant=${tenantId}). Refusing to apply un-substituted SQL.`);
            err.code = 'PLACEHOLDER_NOT_SUBSTITUTED';
            err.tenantId = tenantId;
            err.migrationId = m.migrationId;
            throw err;
        }
        const checksum = checksumFor(substituted);
        if (await isAlreadyApplied(tenantId, m.migrationId, checksum)) {
            results.push({
                migrationId: m.migrationId,
                source: m.source,
                filename: m.filename,
                checksum,
                status: 'skipped',
                durationMs: 0,
            });
            skipped++;
            continue;
        }
        const t0 = Date.now();
        try {
            // Prepend SET search_path so any unqualified DDL (CREATE TABLE foo,
            // ALTER TABLE bar, REFERENCES baz) resolves against the tenant schema.
            // Without this, pool.query opens a fresh connection with the cluster's
            // default search_path (public), so bare DDL in tenant migrations
            // silently leaks into public.* — the root cause of the layer-conflict
            // class of bugs. The SET is NOT included in the checksum so existing
            // applied rows in dos.tenant_migrations remain stable and don't re-run.
            const execSql = `SET search_path TO "${schema}", public;\n${substituted}`;
            await (0, query_1.safeQuery)(execSql);
            const durationMs = Date.now() - t0;
            await recordResult(tenantId, m, checksum, 'applied', durationMs, undefined, options.appliedBy);
            results.push({ migrationId: m.migrationId, source: m.source, filename: m.filename, checksum, status: 'applied', durationMs });
            applied++;
        }
        catch (err) {
            const durationMs = Date.now() - t0;
            const errorMessage = (0, errors_1.toErrorMessage)(err);
            await recordResult(tenantId, m, checksum, 'failed', durationMs, errorMessage, options.appliedBy);
            results.push({ migrationId: m.migrationId, source: m.source, filename: m.filename, checksum, status: 'failed', durationMs, errorMessage });
            failed++;
            logger.error({ tenantId, migrationId: m.migrationId, error: errorMessage }, '[tenant-migrations] migration failed');
            if (!options.continueOnError) {
                throw Object.assign(new Error(`Tenant migration failed: ${m.migrationId}: ${errorMessage}`), {
                    code: 'TENANT_MIGRATION_FAILED',
                    tenantId,
                    migrationId: m.migrationId,
                    summary: { tenantId, schema, results, applied, skipped, failed },
                });
            }
        }
    }
    return { tenantId, schema, results, applied, skipped, failed };
}
/**
 * Backfill: for an existing tenant, mark every discovered migration as
 * "verified-by-backfill" if its post-substitution SQL would be a no-op
 * (i.e. all CREATE TABLE IF NOT EXISTS targets already exist). This lets
 * us bring legacy tenants under the tracker without re-running migrations
 * that are known-applied. NOT a substitute for drift detection — it only
 * proves the named tables exist, not that columns/constraints match.
 */
async function backfillTrackerByExistence(tenantId, options = {}) {
    (0, tenant_1.assertTenantId)(tenantId);
    const schema = (0, tenant_1.tenantSchema)(tenantId);
    const logger = (0, logger_1.getDbLogger)();
    const discovered = discoverTenantMigrations(options);
    const tablesRes = await (0, query_1.safeQuery)(`SELECT table_name FROM information_schema.tables WHERE table_schema = $1`, [schema]);
    const existingTables = new Set(tablesRes.rows.map((r) => String(r.table_name).toLowerCase()));
    const results = [];
    let applied = 0;
    let skipped = 0;
    let failed = 0;
    for (const m of discovered) {
        const substituted = substitutePlaceholder(m.rawSql, schema);
        // Same guard as runTenantMigrationsTracked: an un-substituted placeholder
        // would corrupt both the checksum and the table-name extraction below,
        // silently mis-classifying migrations as "skipped" instead of verified.
        if (substituted.includes('__TENANT_SCHEMA__')) {
            const err = new Error(`[tenant-migrations] backfill placeholder substitution failed for ${m.migrationId} (tenant=${tenantId}).`);
            err.code = 'PLACEHOLDER_NOT_SUBSTITUTED';
            throw err;
        }
        const checksum = checksumFor(substituted);
        if (await isAlreadyApplied(tenantId, m.migrationId, checksum)) {
            results.push({ migrationId: m.migrationId, source: m.source, filename: m.filename, checksum, status: 'skipped', durationMs: 0 });
            skipped++;
            continue;
        }
        const created = extractCreateTableNames(substituted);
        const allPresent = created.length > 0 && created.every((t) => existingTables.has(t.toLowerCase()));
        if (allPresent) {
            await recordResult(tenantId, m, checksum, 'verified-by-backfill', 0, undefined, options.appliedBy ?? 'backfill');
            results.push({ migrationId: m.migrationId, source: m.source, filename: m.filename, checksum, status: 'applied', durationMs: 0 });
            applied++;
        }
        else {
            logger.info({ tenantId, migrationId: m.migrationId, missing: created.filter((t) => !existingTables.has(t.toLowerCase())) }, '[tenant-migrations] backfill skipped — tables missing, real run needed');
            skipped++;
            results.push({ migrationId: m.migrationId, source: m.source, filename: m.filename, checksum, status: 'skipped', durationMs: 0 });
        }
    }
    return { tenantId, schema, results, applied, skipped, failed };
}
/**
 * Pull table names out of CREATE TABLE statements. Handles:
 *   CREATE TABLE [IF NOT EXISTS] [schema.]<table> (
 * where schema may be quoted (the __TENANT_SCHEMA__ substitution wraps it
 * in double-quotes). Returns table names without schema prefix.
 */
function extractCreateTableNames(sql) {
    const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*(?:"([^"]+)"|([a-zA-Z_][a-zA-Z0-9_]*))/gi;
    const out = [];
    let m;
    while ((m = re.exec(sql)) !== null) {
        out.push(m[1] ?? m[2]);
    }
    return out;
}
//# sourceMappingURL=tenant-migrations.js.map
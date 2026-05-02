import { createHash } from 'crypto';
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, basename } from 'path';
import { safeQuery } from './query';
import { tenantSchema, assertTenantId } from './tenant';
import { getDbLogger } from './logger';
import { toErrorMessage } from './errors';

/**
 * Per-tenant migration runner.
 *
 * Replaces the previous fire-and-forget `runTenantMigrations` flow which:
 *  - swallowed failures with `.warn`
 *  - silently created stub tables for "critical" names when migrations
 *    failed (the drift factory)
 *  - had no record of what was applied to which tenant
 *
 * This runner writes every attempt to `dos.tenant_migrations` and:
 *  - skips a migration if a row exists with matching checksum + status='applied'
 *  - re-applies if the checksum changed (treats migration content as
 *    the version key — no separate version field to drift)
 *  - throws on first failure unless `continueOnError: true`
 *
 * Identifier safety: the tenantId is run through assertTenantId; the
 * substituted SQL replaces __TENANT_SCHEMA__ with `tenantSchema(tenantId)`
 * which carries the strict TENANT_SCHEMA_REGEX invariant.
 */

export type MigrationSource = 'ops/tenant' | `module/${string}` | 'inline-baseline';

export interface DiscoveredMigration {
  migrationId: string;
  source: MigrationSource;
  filename: string;
  absolutePath: string;
  rawSql: string;
}

export interface AppliedMigrationResult {
  migrationId: string;
  source: MigrationSource;
  filename: string;
  checksum: string;
  status: 'applied' | 'failed' | 'skipped';
  durationMs: number;
  errorMessage?: string;
}

export interface RunOptions {
  continueOnError?: boolean;
  appliedBy?: string;
  /** Override the discovery roots; defaults derived from process.cwd() */
  opsTenantDir?: string;
  modulesDir?: string;
  /** Optional in-memory baseline migrations (e.g. inline DDL extracted from db.ts) */
  inlineBaselines?: Array<Pick<DiscoveredMigration, 'migrationId' | 'filename' | 'rawSql'>>;
  /** Filter to a subset of migration IDs (useful for retries) */
  onlyMigrationIds?: string[];
}

export interface RunSummary {
  tenantId: string;
  schema: string;
  results: AppliedMigrationResult[];
  applied: number;
  skipped: number;
  failed: number;
}

const SCHEMA_PLACEHOLDER = /__TENANT_SCHEMA__/g;
const QUOTED_SCHEMA_PLACEHOLDER = /"__TENANT_SCHEMA__"/g;

// Substitute the placeholder. Many migration files already wrap the
// placeholder in double quotes ("__TENANT_SCHEMA__"); blindly re-quoting
// the bare form would yield ""tenant_xxx"" — a zero-length identifier
// followed by an unquoted name. Replace the quoted form first with the
// quoted schema, then any remaining bare occurrences with the quoted
// schema, so all rendered identifiers are exactly "tenant_xxx".
function substitutePlaceholder(sql: string, schema: string): string {
  const quoted = `"${schema}"`;
  return sql.replace(QUOTED_SCHEMA_PLACEHOLDER, quoted).replace(SCHEMA_PLACEHOLDER, quoted);
}

/**
 * Discovery roots searched, in priority order:
 *   1. Inline baselines (from RunOptions.inlineBaselines)
 *   2. Canonical per-module path: modules/<mod>/db/tenant/migrations/*.sql
 *      (post-SQL-reorg 2026-04-22 — the current source of truth)
 *   3. Legacy per-module path: modules/<mod>/source/backend/<mod>/migrations/*.sql
 *      (pre-reorg; retained for backward compat, canonical wins on collision)
 *   4. Legacy central path: ops/migrations/tenant/*.sql
 *      (pre-reorg; retained for backward compat)
 *
 * Every root scan — present OR absent — is reported in a single structured
 * info log at the end so operators can see which roots contributed files.
 * Silent skipping is not allowed: missing roots are named in the log.
 */
interface RootScan {
  kind: 'module-canonical' | 'module-legacy' | 'ops-legacy';
  path: string;
  mod?: string;
  exists: boolean;
  found: number;
}

function scanModuleDir(
  modulesDir: string,
  mod: string,
  subPath: string,
  kind: 'module-canonical' | 'module-legacy',
  seenIds: Set<string>,
  out: DiscoveredMigration[],
  logger: ReturnType<typeof getDbLogger>,
): RootScan {
  const dir = join(modulesDir, mod, subPath);
  const exists = existsSync(dir) && statSync(dir).isDirectory();
  const scan: RootScan = { kind, path: dir, mod, exists, found: 0 };
  if (!exists) return scan;

  // Locked exclusions — see ops/sql/sql-ownership.registry.yml runnersMustNotScan.
  // The runner must NEVER scan canonical/proposals/frozen/fixtures/tests/__tests__
  // directories even if modulesDir is rerooted by an operator.
  if (/[\\/](canonical|_frozen|proposals|fixtures|tests|__tests__)([\\/]|$)/i.test(dir)) {
    scan.found = 0;
    return scan;
  }
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql') && !f.includes('_down') && !/_frozen/i.test(f))
    .sort();

  for (const f of files) {
    const migrationId = `module/${mod}/${basename(f, '.sql')}`;
    if (seenIds.has(migrationId)) {
      logger.warn(
        { mod, filename: f, migrationId, droppedPath: dir },
        '[tenant-migrations] duplicate migrationId — canonical path wins, legacy copy ignored',
      );
      continue;
    }
    seenIds.add(migrationId);
    const abs = join(dir, f);
    out.push({
      migrationId,
      source: `module/${mod}` as MigrationSource,
      filename: f,
      absolutePath: abs,
      rawSql: readFileSync(abs, 'utf-8'),
    });
    scan.found++;
  }
  return scan;
}

export function discoverTenantMigrations(opts: RunOptions = {}): DiscoveredMigration[] {
  const cwd = process.cwd();
  const opsTenantDir = opts.opsTenantDir ?? join(cwd, 'ops/migrations/tenant');
  const modulesDir = opts.modulesDir ?? join(cwd, 'modules');
  const logger = getDbLogger();

  const out: DiscoveredMigration[] = [];
  const seenIds = new Set<string>();
  const scans: RootScan[] = [];

  // 1. Inline baselines (in-memory; always first)
  for (const b of opts.inlineBaselines ?? []) {
    if (seenIds.has(b.migrationId)) continue;
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
  if (existsSync(modulesDir)) {
    const modules = readdirSync(modulesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    for (const mod of modules) {
      scans.push(scanModuleDir(modulesDir, mod, 'db/tenant/migrations',        'module-canonical', seenIds, out, logger));
      scans.push(scanModuleDir(modulesDir, mod, `source/backend/${mod}/migrations`, 'module-legacy', seenIds, out, logger));
    }
  }

  // 4. Legacy central tenant migrations: ops/migrations/tenant/*.sql
  const opsScan: RootScan = { kind: 'ops-legacy', path: opsTenantDir, exists: false, found: 0 };
  if (existsSync(opsTenantDir) && statSync(opsTenantDir).isDirectory()) {
    opsScan.exists = true;
    const files = readdirSync(opsTenantDir)
      .filter((f) => f.endsWith('.sql') && !f.includes('_down'))
      .sort();
    for (const f of files) {
      const migrationId = `ops/tenant/${basename(f, '.sql')}`;
      if (seenIds.has(migrationId)) continue;
      seenIds.add(migrationId);
      const abs = join(opsTenantDir, f);
      out.push({
        migrationId,
        source: 'ops/tenant',
        filename: f,
        absolutePath: abs,
        rawSql: readFileSync(abs, 'utf-8'),
      });
      opsScan.found++;
    }
  }
  scans.push(opsScan);

  // One structured discovery summary — roots found vs missing, per user's
  // F0.4 rule: never silently skip a migration root.
  const canonicalModules = scans.filter((s) => s.kind === 'module-canonical' && s.exists).length;
  const legacyModules    = scans.filter((s) => s.kind === 'module-legacy'    && s.exists).length;
  const canonicalFiles   = scans.filter((s) => s.kind === 'module-canonical').reduce((n, s) => n + s.found, 0);
  const legacyFiles      = scans.filter((s) => s.kind === 'module-legacy').reduce((n, s) => n + s.found, 0);
  const rootsMissing = scans
    .filter((s) => !s.exists)
    .map((s) => ({ kind: s.kind, path: s.path, mod: s.mod }))
    .slice(0, 20);
  logger.info(
    {
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
    },
    '[tenant-migrations] discovery complete',
  );

  if (opts.onlyMigrationIds && opts.onlyMigrationIds.length > 0) {
    const allow = new Set(opts.onlyMigrationIds);
    return out.filter((m) => allow.has(m.migrationId));
  }
  return out;
}

function checksumFor(substitutedSql: string): string {
  return createHash('sha256').update(substitutedSql, 'utf8').digest('hex');
}

async function isAlreadyApplied(
  tenantId: string,
  migrationId: string,
  checksum: string,
): Promise<boolean> {
  const res = await safeQuery(
    `SELECT 1
       FROM dos.tenant_migrations
      WHERE tenant_id = $1
        AND migration_id = $2
        AND checksum = $3
        AND status IN ('applied','verified-by-backfill')
      LIMIT 1`,
    [tenantId, migrationId, checksum],
  );
  return res.rows.length > 0;
}

type RecordedStatus = AppliedMigrationResult['status'] | 'verified-by-backfill';

async function recordResult(
  tenantId: string,
  m: DiscoveredMigration,
  checksum: string,
  status: RecordedStatus,
  durationMs: number,
  errorMessage: string | undefined,
  appliedBy: string | undefined,
): Promise<void> {
  await safeQuery(
    `INSERT INTO dos.tenant_migrations
       (tenant_id, migration_id, source, filename, checksum, status, duration_ms, error_message, applied_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (tenant_id, migration_id, checksum) DO UPDATE
       SET status = EXCLUDED.status,
           duration_ms = EXCLUDED.duration_ms,
           error_message = EXCLUDED.error_message,
           applied_at = NOW(),
           applied_by = EXCLUDED.applied_by`,
    [tenantId, m.migrationId, m.source, m.filename, checksum, status, durationMs, errorMessage ?? null, appliedBy ?? null],
  );
}

export async function runTenantMigrationsTracked(
  tenantId: string,
  options: RunOptions = {},
): Promise<RunSummary> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const logger = getDbLogger();

  const discovered = discoverTenantMigrations(options);
  const results: AppliedMigrationResult[] = [];
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
      const err: Error & { code?: string; tenantId?: string; migrationId?: string } =
        new Error(
          `[tenant-migrations] placeholder substitution failed for ${m.migrationId} ` +
          `(tenant=${tenantId}). Refusing to apply un-substituted SQL.`,
        );
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
      await safeQuery(execSql);
      const durationMs = Date.now() - t0;
      await recordResult(tenantId, m, checksum, 'applied', durationMs, undefined, options.appliedBy);
      results.push({ migrationId: m.migrationId, source: m.source, filename: m.filename, checksum, status: 'applied', durationMs });
      applied++;
    } catch (err) {
      const durationMs = Date.now() - t0;
      const errorMessage = toErrorMessage(err);
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
export async function backfillTrackerByExistence(
  tenantId: string,
  options: RunOptions = {},
): Promise<RunSummary> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const logger = getDbLogger();
  const discovered = discoverTenantMigrations(options);

  const tablesRes = await safeQuery(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1`,
    [schema],
  );
  const existingTables = new Set<string>(tablesRes.rows.map((r) => String((r as { table_name: string }).table_name).toLowerCase()));

  const results: AppliedMigrationResult[] = [];
  let applied = 0;
  let skipped = 0;
  let failed = 0;

  for (const m of discovered) {
    const substituted = substitutePlaceholder(m.rawSql, schema);

    // Same guard as runTenantMigrationsTracked: an un-substituted placeholder
    // would corrupt both the checksum and the table-name extraction below,
    // silently mis-classifying migrations as "skipped" instead of verified.
    if (substituted.includes('__TENANT_SCHEMA__')) {
      const err: Error & { code?: string } = new Error(
        `[tenant-migrations] backfill placeholder substitution failed for ${m.migrationId} (tenant=${tenantId}).`,
      );
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
    } else {
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
function extractCreateTableNames(sql: string): string[] {
  const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*(?:"([^"]+)"|([a-zA-Z_][a-zA-Z0-9_]*))/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    out.push(m[1] ?? m[2]);
  }
  return out;
}

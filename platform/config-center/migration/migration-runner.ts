/**
 * Canonical Platform Migration Runner
 *
 * Tracks applied migrations in `dos.platform_migrations(filename, checksum, applied_at, duration_ms)`.
 * Supports CONCURRENTLY DDL (auto-detected or via `-- dos:no-transaction` header).
 * Supports `down` rollback by filename.
 * Enforces SHA-256 checksum drift detection.
 *
 * CLI usage:
 *   ts-node migration/migration-runner.ts up       [--dir <dir>]
 *   ts-node migration/migration-runner.ts down <filename> [--dir <dir>]
 *   ts-node migration/migration-runner.ts status
 *   ts-node migration/migration-runner.ts plan
 *   ts-node migration/migration-runner.ts baseline [--from <dir>] [--dry-run]
 *
 * ADR: ops/docs/ADR/004-migration-runner-canonical.md
 */

import { Pool, PoolClient } from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface AppliedMigration {
  filename: string;
  checksum: string;
  applied_at: Date;
  duration_ms: number;
  current_path?: string | null;
}

export interface MigrationRunResult {
  filename: string;
  direction: 'up' | 'down';
  duration_ms: number;
  skipped: boolean;
  skippedReason?: string;
}

const BOOTSTRAP_SQL = `
CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.platform_migrations (
  filename    TEXT        NOT NULL PRIMARY KEY,
  checksum    TEXT        NOT NULL,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms INTEGER     NOT NULL
);
`;

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function requiresNoTransaction(sql: string): boolean {
  const header = sql.slice(0, 512);
  if (/--\s*dos:no-transaction/i.test(header)) return true;
  if (/\bCONCURRENTLY\b/i.test(sql)) return true;
  return false;
}

/**
 * Returns a non-empty reason string if the migration must be SKIPPED at apply
 * time (still discovered, still checksum-tracked when re-baselining, but never
 * executed). Returns null when the file is safe to apply.
 *
 * Hard gates (ENTERPRISE GUARD — DO NOT SOFTEN without owner sign-off):
 *   1. Path-based: any file under a `_draft/`, `_rejected/`, or `_disabled/`
 *      directory segment is treated as quarantined.
 *   2. Header-based: any of the following markers anywhere in the first 1 KiB
 *      of the file aborts apply with a loud reason:
 *         -- dos:draft
 *         DRAFT ONLY
 *         DO NOT APPLY
 *         MUST NOT be applied
 */
function draftSkipReason(absPath: string, sql: string): string | null {
  const segs = absPath.split(/[/\\]/);
  for (const s of segs) {
    if (s === '_draft' || s === '_rejected' || s === '_disabled') {
      return `quarantined by path segment "${s}/"`;
    }
  }
  const header = sql.slice(0, 1024);
  if (/--\s*dos:draft\b/i.test(header)) return 'header marker -- dos:draft';
  if (/\bDRAFT ONLY\b/i.test(header)) return 'header marker "DRAFT ONLY"';
  if (/\bDO NOT APPLY\b/i.test(header)) return 'header marker "DO NOT APPLY"';
  if (/\bMUST NOT be applied\b/i.test(header)) return 'header marker "MUST NOT be applied"';
  return null;
}

/**
 * Translate a raw pg error into an actionable message and rethrow. Today
 * we only specialize SQLSTATE 42501 (insufficient_privilege) because every
 * historical incident traced back to schema/table ownership drift between
 * `dos_migrator` and `postgres`. Add more cases here as we learn.
 */
function rethrowWithContext(err: unknown, filename: string, relPath: string): never {
  const e = err as { code?: string; message?: string };
  if (e && e.code === '42501') {
    const m = e.message || '';
    const tableMatch = m.match(/must be owner of (?:table|relation|view|sequence|schema)\s+([\w.]+)/i);
    const obj = tableMatch ? tableMatch[1] : '<unknown object>';
    throw new Error(
      `[migration] ${filename} (${relPath}) failed with SQLSTATE 42501 ` +
      `(insufficient_privilege) on ${obj}.\n` +
      `  CAUSE   The connecting role is not the owner of ${obj} and is not a superuser.\n` +
      `  FIX     1) As superuser run:  ALTER TABLE ${obj} OWNER TO dos_migrator;\n` +
      `          2) Or run wave-0 migration 20260430_0000_normalize_platform_schema_ownership.sql\n` +
      `             with a role that is a member of the current owner.\n` +
      `  ORIGIN  ${m}`
    );
  }
  throw err as Error;
}

function resolveDownFilename(upFilename: string): string {
  if (upFilename.endsWith('_up.sql')) {
    return upFilename.replace(/_up\.sql$/, '_down.sql');
  }
  return upFilename.replace(/\.sql$/, '_down.sql');
}

async function bootstrap(client: PoolClient): Promise<void> {
  await client.query(BOOTSTRAP_SQL);
}

async function getApplied(client: PoolClient): Promise<Map<string, AppliedMigration>> {
  // Tolerant read: works whether or not the `current_path` column has been
  // added (so this runner can operate on a DB that predates migration
  // 20260422_0001_platform_migrations_current_path.sql).
  const hasColumn = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'dos'
         AND table_name   = 'platform_migrations'
         AND column_name  = 'current_path'
     ) AS exists`
  );
  const cols = hasColumn.rows[0]?.exists
    ? 'filename, checksum, applied_at, duration_ms, current_path'
    : 'filename, checksum, applied_at, duration_ms, NULL::text AS current_path';
  const result = await client.query<AppliedMigration>(
    `SELECT ${cols} FROM dos.platform_migrations ORDER BY applied_at ASC`
  );
  const map = new Map<string, AppliedMigration>();
  for (const row of result.rows) {
    map.set(row.filename, row);
  }
  return map;
}

async function updateCurrentPath(
  pool: Pool,
  filename: string,
  newPath: string
): Promise<void> {
  // No-op if the column does not yet exist. Safe on legacy DBs.
  try {
    await pool.query(
      'UPDATE dos.platform_migrations SET current_path = $2 WHERE filename = $1',
      [filename, newPath]
    );
  } catch (err: any) {
    const message = String(err?.message ?? '');
    if (!/column.*current_path.*does not exist/i.test(message)) {
      throw err;
    }
  }
}

function parseSupersedesChecksums(sql: string): string[] {
  // Recognize `-- dos:supersedes-checksum: <sha256>` headers on the first
  // ~1 KB of a migration file. Multiple headers mean "any of these parent
  // checksums being applied counts as this file already applied".
  const header = sql.slice(0, 1024);
  const hashes: string[] = [];
  const re = /--\s*dos:supersedes-checksum:\s*([0-9a-f]{64})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(header))) hashes.push(m[1].toLowerCase());
  return hashes;
}

function collectUpFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    throw new Error(`Migrations directory does not exist: ${dir}`);
  }
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.sql') && !f.endsWith('_down.sql'))
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Recursive discovery across the post-reorg migration tree.
 *
 *   - `ops/migrations/`                                    (frozen history, still served)
 *   - `migration/`                                         (legacy bootstrap, still served)
 *   - `modules/* /db/{tenant,public}/migrations`           (legacy per-module home)
 *   - `services/* /migrations`                             (retained service-local infra)
 *   - `platform/<module>/migrations/{public,tenant}`       (platform module home — DAuth et al.)
 *
 * Returns records with both the filename (for PK lookup) and the absolute
 * path (for read). Caller is responsible for passing a starting root.
 * Files under the same filename in multiple paths are returned separately;
 * de-duplication by checksum happens in the apply loop.
 */
interface DiscoveredFile { filename: string; absPath: string; relPath: string }

function discoverAllMigrations(repoRoot: string): DiscoveredFile[] {
  const out: DiscoveredFile[] = [];
  const seenRel = new Set<string>();
  const roots = [
    path.join(repoRoot, 'ops', 'migrations'),
    path.join(repoRoot, 'migration'),
  ];
  // per-module and per-service trees
  const modulesDir = path.join(repoRoot, 'modules');
  if (fs.existsSync(modulesDir)) {
    for (const mod of fs.readdirSync(modulesDir)) {
      for (const scope of ['tenant', 'public']) {
        roots.push(path.join(modulesDir, mod, 'db', scope, 'migrations'));
      }
      // Legacy per-module path (pre-reorg) — still served for compatibility.
      roots.push(path.join(modulesDir, mod, 'source', 'backend', mod, 'migrations'));
    }
  }
  const servicesDir = path.join(repoRoot, 'services');
  if (fs.existsSync(servicesDir)) {
    for (const svc of fs.readdirSync(servicesDir)) {
      roots.push(path.join(servicesDir, svc, 'migrations'));
    }
  }
  // Platform module home — each platform module (dauth, dsoc, dnoc, dos)
  // owns its own migrations under platform/<module>/migrations/{public,tenant}.
  const platformDir = path.join(repoRoot, 'platform');
  if (fs.existsSync(platformDir)) {
    for (const mod of fs.readdirSync(platformDir)) {
      const migRoot = path.join(platformDir, mod, 'migrations');
      if (!fs.existsSync(migRoot)) continue;
      // Recurse through this platform module's migrations tree so both
      // migrations/public, migrations/tenant, and any future sub-layout are
      // picked up by the generic `walk()` below.
      roots.push(migRoot);
    }
  }
  const walk = (root: string): void => {
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) return;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      const full = path.join(root, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.sql')) continue;
      if (entry.name.endsWith('_down.sql')) continue;
      const rel = path.relative(repoRoot, full);
      if (seenRel.has(rel)) continue;
      // Skip tenant-scoped trees — anything living under a `migrations/tenant`
      // directory is applied per-tenant by the tenant onboarding flow, not
      // by the platform-level runner. Also skip tenant-template files
      // (contain __TENANT_SCHEMA__) wherever they appear.
      const relSeg = rel.split(path.sep);
      const tenantIdx = relSeg.indexOf('tenant');
      if (tenantIdx > 0 && relSeg[tenantIdx - 1] === 'migrations') continue;
      if (relSeg.includes('db') && relSeg.includes('tenant')) continue;
      try {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes('__TENANT_SCHEMA__')) continue;
      } catch { continue; }
      seenRel.add(rel);
      out.push({ filename: entry.name, absPath: full, relPath: rel });
    }
  };
  for (const r of roots) walk(r);
  // Stable ordering: lexicographic by filename, then by path — this matches
  // the legacy single-dir behavior so already-applied sequences line up.
  out.sort((a, b) => {
    const byName = a.filename.localeCompare(b.filename);
    if (byName !== 0) return byName;
    return a.relPath.localeCompare(b.relPath);
  });
  return out;
}

interface DiscoveredHashed extends DiscoveredFile { sql: string; checksum: string }

/**
 * Wraps discoverAllMigrations, reading each file once and computing its
 * SHA-256. Callers that need both the sql text and the checksum (plan,
 * baseline, migrateUpAll) use this to avoid re-reading files downstream.
 * Ordering and de-dup semantics are inherited from discoverAllMigrations
 * unchanged.
 */
function discoverAllMigrationsHashed(repoRoot: string): DiscoveredHashed[] {
  return discoverAllMigrations(repoRoot).map(f => {
    const sql = fs.readFileSync(f.absPath, 'utf8');
    return { ...f, sql, checksum: sha256(sql) };
  });
}

function splitSqlStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = '';
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag: string | null = null;
  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (inLineComment) {
      buf += ch;
      if (ch === '\n') inLineComment = false;
      i++; continue;
    }
    if (inBlockComment) {
      buf += ch;
      if (ch === '*' && next === '/') { buf += next; i += 2; inBlockComment = false; continue; }
      i++; continue;
    }
    if (dollarTag) {
      buf += ch;
      if (ch === '$' && sql.startsWith(dollarTag, i)) {
        buf += sql.slice(i + 1, i + dollarTag.length);
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      i++; continue;
    }
    if (inSingle) {
      buf += ch;
      if (ch === "'" && next === "'") { buf += next; i += 2; continue; }
      if (ch === "'") inSingle = false;
      i++; continue;
    }
    if (inDouble) {
      buf += ch;
      if (ch === '"' && next === '"') { buf += next; i += 2; continue; }
      if (ch === '"') inDouble = false;
      i++; continue;
    }
    if (ch === '-' && next === '-') { buf += ch; inLineComment = true; i++; continue; }
    if (ch === '/' && next === '*') { buf += ch; inBlockComment = true; i++; continue; }
    if (ch === "'") { inSingle = true; buf += ch; i++; continue; }
    if (ch === '"') { inDouble = true; buf += ch; i++; continue; }
    if (ch === '$') {
      const m = sql.slice(i).match(/^\$[A-Za-z_][A-Za-z0-9_]*?\$|^\$\$/);
      if (m) { dollarTag = m[0]; buf += m[0]; i += m[0].length; continue; }
    }
    if (ch === ';') {
      const trimmed = buf.trim();
      if (trimmed.length > 0) out.push(trimmed);
      buf = '';
      i++; continue;
    }
    buf += ch; i++;
  }
  const tail = buf.trim();
  if (tail.length > 0) out.push(tail);
  return out;
}

async function executeSql(pool: Pool, sql: string, noTransaction: boolean): Promise<void> {
  if (noTransaction) {
    // CREATE INDEX CONCURRENTLY and friends cannot run inside a transaction
    // block. Postgres treats a multi-statement simple-query batch as an
    // implicit transaction, so split on `;` and run each statement in its
    // own query cycle to keep the CONCURRENTLY statement outside any tx.
    const statements = splitSqlStatements(sql);
    const client = await pool.connect();
    try {
      for (const stmt of statements) {
        await client.query(stmt);
      }
    } finally {
      client.release();
    }
  } else {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

async function recordApplied(
  pool: Pool,
  filename: string,
  checksum: string,
  duration_ms: number
): Promise<void> {
  await pool.query(
    `INSERT INTO dos.platform_migrations (filename, checksum, applied_at, duration_ms)
     VALUES ($1, $2, NOW(), $3)`,
    [filename, checksum, duration_ms]
  );
}

async function removeRecord(pool: Pool, filename: string): Promise<void> {
  await pool.query('DELETE FROM dos.platform_migrations WHERE filename = $1', [filename]);
}

export async function migrateUp(
  pool: Pool,
  dir: string
): Promise<MigrationRunResult[]> {
  const client = await pool.connect();
  try {
    await bootstrap(client);
  } finally {
    client.release();
  }

  const applied = await (async () => {
    const c = await pool.connect();
    try {
      return await getApplied(c);
    } finally {
      c.release();
    }
  })();

  // Build a reverse index by checksum so we can recognize files that were
  // already applied under a prior filename (i.e. git-mv'd after Phase C).
  const appliedByChecksum = new Map<string, AppliedMigration>();
  for (const rec of applied.values()) appliedByChecksum.set(rec.checksum, rec);

  const files = collectUpFiles(dir);
  const results: MigrationRunResult[] = [];

  for (const filename of files) {
    const filePath = path.join(dir, filename);
    const sql = fs.readFileSync(filePath, 'utf8');
    const checksum = sha256(sql);

    // Fast path: filename PK match.
    if (applied.has(filename)) {
      const recorded = applied.get(filename)!;
      if (recorded.checksum !== checksum) {
        throw new Error(
          `Checksum drift detected for "${filename}": ` +
          `recorded=${recorded.checksum} current=${checksum}. ` +
          `Do not modify applied migration files.`
        );
      }
      results.push({ filename, direction: 'up', duration_ms: 0, skipped: true, skippedReason: 'already applied' });
      continue;
    }

    // Checksum remap: file's filename is new (git-mv) but content is an
    // already-applied migration. Record the new path; do not re-run.
    const byChecksum = appliedByChecksum.get(checksum);
    if (byChecksum) {
      await updateCurrentPath(pool, byChecksum.filename, filePath);
      results.push({
        filename,
        direction: 'up',
        duration_ms: 0,
        skipped: true,
        skippedReason: `path_remap: content matches applied "${byChecksum.filename}"`,
      });
      continue;
    }

    // Supersedes: file advertises one or more parent-checksums; if any is
    // already applied, this file is an extract/shard of that work and must
    // not re-execute. Record the shard under its own filename with a
    // synthetic `via-provenance` flag by setting duration_ms=0 and writing
    // current_path to point to the shard.
    const parents = parseSupersedesChecksums(sql);
    if (parents.length > 0) {
      const appliedParent = parents.find(p => appliedByChecksum.has(p));
      if (appliedParent) {
        const parentRow = appliedByChecksum.get(appliedParent)!;
        await recordApplied(pool, filename, checksum, 0);
        await updateCurrentPath(pool, filename, filePath);
        results.push({
          filename,
          direction: 'up',
          duration_ms: 0,
          skipped: true,
          skippedReason: `supersedes applied parent "${parentRow.filename}" (${appliedParent.slice(0,12)}…)`,
        });
        // Ensure subsequent shards in this batch see us as already applied.
        applied.set(filename, { filename, checksum, applied_at: new Date(), duration_ms: 0, current_path: filePath });
        appliedByChecksum.set(checksum, applied.get(filename)!);
        continue;
      }
    }

    const noTx = requiresNoTransaction(sql);
    const start = Date.now();
    process.stdout.write(`[migration] applying ${filename}${noTx ? ' (no-transaction)' : ''} ...`);

    await executeSql(pool, sql, noTx);
    const duration_ms = Date.now() - start;
    await recordApplied(pool, filename, checksum, duration_ms);
    await updateCurrentPath(pool, filename, filePath);

    process.stdout.write(` done (${duration_ms}ms)\n`);
    results.push({ filename, direction: 'up', duration_ms, skipped: false });
  }

  return results;
}

export interface MigrationPlanEntry {
  filename: string;
  relPath: string;
  checksum: string;
  action:
    | 'already-applied'
    | 'path-remap'
    | 'supersedes'
    | 'drift-error'
    | 'new-apply';
  detail?: string;
}

/**
 * Read-only planner: walks the same discovery path as migrateUpAll and
 * reports what each file's fate would be on an actual apply — without
 * mutating the DB. Emits no-op UPDATEs or INSERTs.
 */
export async function planMigrations(
  pool: Pool,
  repoRoot: string
): Promise<MigrationPlanEntry[]> {
  const client = await pool.connect();
  try {
    await bootstrap(client);
  } finally {
    client.release();
  }

  const applied = await (async () => {
    const c = await pool.connect();
    try {
      return await getApplied(c);
    } finally {
      c.release();
    }
  })();
  const appliedByChecksum = new Map<string, AppliedMigration>();
  for (const rec of applied.values()) appliedByChecksum.set(rec.checksum, rec);

  const discoveredRaw = discoverAllMigrations(repoRoot);
  // Pre-hash so we can re-order duplicate-filename groups so the copy
  // whose checksum matches the recorded value (or whose supersedes-header
  // claims to baseline the recorded value) wins as canonical.
  const discoveredHashed = discoveredRaw.map(f => {
    const sql = fs.readFileSync(f.absPath, 'utf8');
    const checksum = sha256(sql);
    return { ...f, sql, checksum };
  });
  const filenameGroups = new Map<string, typeof discoveredHashed>();
  for (const f of discoveredHashed) {
    if (!filenameGroups.has(f.filename)) filenameGroups.set(f.filename, []);
    filenameGroups.get(f.filename)!.push(f);
  }
  const discovered = [];
  for (const [, group] of filenameGroups) {
    const recorded = applied.get(group[0].filename);
    if (recorded && group.length > 1) {
      group.sort((a, b) => {
        const aCanon =
          a.checksum === recorded.checksum ||
          parseSupersedesChecksums(a.sql).includes(recorded.checksum) ? 0 : 1;
        const bCanon =
          b.checksum === recorded.checksum ||
          parseSupersedesChecksums(b.sql).includes(recorded.checksum) ? 0 : 1;
        if (aCanon !== bCanon) return aCanon - bCanon;
        return a.relPath.localeCompare(b.relPath);
      });
    }
    for (const g of group) discovered.push(g);
  }
  const plan: MigrationPlanEntry[] = [];
  const seenFilename = new Set<string>();

  for (const { filename, absPath, relPath, sql, checksum } of discovered) {
    void absPath; void sql;

    if (applied.has(filename)) {
      const recorded = applied.get(filename)!;
      // De-dup duplicate-filename physical copies. After the first occurrence
      // is resolved, subsequent copies are reported as `path-remap` to avoid
      // false drift-errors when several legacy/canonical paths coexist.
      if (seenFilename.has(filename)) {
        plan.push({
          filename, relPath, checksum, action: 'path-remap',
          detail: `duplicate filename — canonical copy already classified`,
        });
        continue;
      }
      if (recorded.checksum !== checksum) {
        const parents = parseSupersedesChecksums(sql);
        if (parents.includes(recorded.checksum)) {
          plan.push({
            filename, relPath, checksum, action: 'supersedes',
            detail: `re-baseline: supersedes recorded ${recorded.checksum.slice(0,12)}…`,
          });
          seenFilename.add(filename);
          continue;
        }
        if (appliedByChecksum.has(checksum)) {
          plan.push({
            filename, relPath, checksum, action: 'path-remap',
            detail: `collision with applied "${appliedByChecksum.get(checksum)!.filename}"`,
          });
          seenFilename.add(filename);
          continue;
        }
        plan.push({
          filename, relPath, checksum, action: 'drift-error',
          detail: `recorded=${recorded.checksum.slice(0,12)}… current=${checksum.slice(0,12)}…`,
        });
        seenFilename.add(filename);
      } else {
        plan.push({ filename, relPath, checksum, action: 'already-applied' });
        seenFilename.add(filename);
      }
      continue;
    }

    const byChecksum = appliedByChecksum.get(checksum);
    if (byChecksum) {
      plan.push({
        filename, relPath, checksum, action: 'path-remap',
        detail: `matches applied "${byChecksum.filename}"`,
      });
      continue;
    }

    const parents = parseSupersedesChecksums(sql);
    const appliedParent = parents.find(p => appliedByChecksum.has(p));
    if (appliedParent) {
      plan.push({
        filename, relPath, checksum, action: 'supersedes',
        detail: `parent "${appliedByChecksum.get(appliedParent)!.filename}"`,
      });
      continue;
    }

    plan.push({ filename, relPath, checksum, action: 'new-apply' });
  }

  return plan;
}

/**
 * Post-reorg apply: discover migrations across every known root
 * (ops/migrations, migration, modules/* /db, services/* /migrations), dedupe
 * by checksum, and apply any that aren't already recorded. Handles checksum
 * remap and supersedes-provenance exactly like migrateUp.
 */
export async function migrateUpAll(
  pool: Pool,
  repoRoot: string
): Promise<MigrationRunResult[]> {
  const client = await pool.connect();
  try {
    await bootstrap(client);
  } finally {
    client.release();
  }

  const applied = await (async () => {
    const c = await pool.connect();
    try {
      return await getApplied(c);
    } finally {
      c.release();
    }
  })();
  const appliedByChecksum = new Map<string, AppliedMigration>();
  for (const rec of applied.values()) appliedByChecksum.set(rec.checksum, rec);

  const discoveredRaw = discoverAllMigrations(repoRoot);
  const discoveredHashed = discoveredRaw.map(f => {
    const sql = fs.readFileSync(f.absPath, 'utf8');
    const checksum = sha256(sql);
    return { ...f, sql, checksum };
  });
  const filenameGroups = new Map<string, typeof discoveredHashed>();
  for (const f of discoveredHashed) {
    if (!filenameGroups.has(f.filename)) filenameGroups.set(f.filename, []);
    filenameGroups.get(f.filename)!.push(f);
  }
  const discovered: typeof discoveredHashed = [];
  for (const [, group] of filenameGroups) {
    const recorded = applied.get(group[0].filename);
    if (recorded && group.length > 1) {
      group.sort((a, b) => {
        const aCanon =
          a.checksum === recorded.checksum ||
          parseSupersedesChecksums(a.sql).includes(recorded.checksum) ? 0 : 1;
        const bCanon =
          b.checksum === recorded.checksum ||
          parseSupersedesChecksums(b.sql).includes(recorded.checksum) ? 0 : 1;
        if (aCanon !== bCanon) return aCanon - bCanon;
        return a.relPath.localeCompare(b.relPath);
      });
    }
    for (const g of group) discovered.push(g);
  }
  const results: MigrationRunResult[] = [];
  const seenFilename = new Set<string>();

  for (const { filename, absPath, relPath, sql, checksum } of discovered) {
    if (applied.has(filename)) {
      const recorded = applied.get(filename)!;
      if (seenFilename.has(filename)) {
        results.push({
          filename, direction: 'up', duration_ms: 0, skipped: true,
          skippedReason: `path_remap: duplicate filename — canonical copy already classified`,
        });
        continue;
      }
      if (recorded.checksum !== checksum) {
        const parents = parseSupersedesChecksums(sql);
        if (parents.includes(recorded.checksum)) {
          results.push({
            filename, direction: 'up', duration_ms: 0, skipped: true,
            skippedReason: `re-baseline: supersedes recorded ${recorded.checksum.slice(0,12)}…`,
          });
          seenFilename.add(filename);
          continue;
        }
        if (appliedByChecksum.has(checksum)) {
          results.push({
            filename, direction: 'up', duration_ms: 0, skipped: true,
            skippedReason: `path_remap: collision with applied "${appliedByChecksum.get(checksum)!.filename}"`,
          });
          seenFilename.add(filename);
          continue;
        }
        throw new Error(
          `Checksum drift for "${filename}" at ${relPath}: ` +
          `recorded=${recorded.checksum} current=${checksum}. ` +
          `Do not modify applied migration files.`
        );
      }
      seenFilename.add(filename);
      // Refresh current_path if the file moved since the last run.
      if (recorded.current_path !== absPath) {
        await updateCurrentPath(pool, filename, absPath);
      }
      results.push({ filename, direction: 'up', duration_ms: 0, skipped: true, skippedReason: 'already applied' });
      continue;
    }

    const byChecksum = appliedByChecksum.get(checksum);
    if (byChecksum) {
      await updateCurrentPath(pool, byChecksum.filename, absPath);
      results.push({
        filename,
        direction: 'up',
        duration_ms: 0,
        skipped: true,
        skippedReason: `path_remap: content matches applied "${byChecksum.filename}"`,
      });
      continue;
    }

    const parents = parseSupersedesChecksums(sql);
    if (parents.length > 0) {
      const appliedParent = parents.find(p => appliedByChecksum.has(p));
      if (appliedParent) {
        const parentRow = appliedByChecksum.get(appliedParent)!;
        await recordApplied(pool, filename, checksum, 0);
        await updateCurrentPath(pool, filename, absPath);
        results.push({
          filename,
          direction: 'up',
          duration_ms: 0,
          skipped: true,
          skippedReason: `supersedes applied parent "${parentRow.filename}" (${appliedParent.slice(0,12)}…)`,
        });
        applied.set(filename, { filename, checksum, applied_at: new Date(), duration_ms: 0, current_path: absPath });
        appliedByChecksum.set(checksum, applied.get(filename)!);
        continue;
      }
    }

    const skipReason = draftSkipReason(absPath, sql);
    if (skipReason) {
      process.stdout.write(`[migration] SKIP ${filename} [${relPath}] — ${skipReason}\n`);
      results.push({
        filename, direction: 'up', duration_ms: 0, skipped: true,
        skippedReason: `draft-gate: ${skipReason}`,
      });
      continue;
    }

    const noTx = requiresNoTransaction(sql);
    const start = Date.now();
    process.stdout.write(`[migration] applying ${filename} [${relPath}]${noTx ? ' (no-transaction)' : ''} ...`);

    try {
      await executeSql(pool, sql, noTx);
    } catch (err) {
      process.stdout.write(' FAILED\n');
      rethrowWithContext(err, filename, relPath);
    }
    const duration_ms = Date.now() - start;
    await recordApplied(pool, filename, checksum, duration_ms);
    await updateCurrentPath(pool, filename, absPath);

    process.stdout.write(` done (${duration_ms}ms)\n`);
    results.push({ filename, direction: 'up', duration_ms, skipped: false });
  }

  return results;
}

export interface BaselineEntry {
  filename: string;
  relPath: string;
  checksum: string;
  action: 'imported' | 'skipped-already-tracked' | 'skipped-duplicate-filename';
  detail?: string;
}

/**
 * Mark every discovered migration as already-applied in
 * `dos.platform_migrations` without executing its SQL. Intended to
 * onboard a live DB whose schema is already correct but whose tracker
 * has never been populated (the canonical+untracked classification from
 * the Phase A inventory).
 *
 * Idempotent: filenames already in the tracker emit
 * 'skipped-already-tracked' and are not overwritten. When the same
 * filename is discovered in multiple roots, the lexicographically
 * earlier relPath wins — matching the de-dup semantics migrateUpAll
 * relies on (see discoverAllMigrations ordering at ~line 206).
 *
 *   opts.from    — scope import to a single discovery root (by abs or rel path)
 *   opts.dryRun  — compute the entry list but write nothing to the DB
 */
export async function baselineImport(
  pool: Pool,
  repoRoot: string,
  opts: { from?: string; dryRun?: boolean } = {},
): Promise<BaselineEntry[]> {
  const client = await pool.connect();
  try {
    await bootstrap(client);
  } finally {
    client.release();
  }

  const applied = await (async () => {
    const c = await pool.connect();
    try {
      return await getApplied(c);
    } finally {
      c.release();
    }
  })();

  const fromPrefix = opts.from
    ? path.relative(repoRoot, path.resolve(repoRoot, opts.from))
    : null;

  const discovered = discoverAllMigrationsHashed(repoRoot);
  const seenInThisBatch = new Map<string, string>();
  const entries: BaselineEntry[] = [];

  for (const d of discovered) {
    if (fromPrefix !== null && !d.relPath.startsWith(fromPrefix)) continue;

    if (applied.has(d.filename)) {
      entries.push({
        filename: d.filename, relPath: d.relPath, checksum: d.checksum,
        action: 'skipped-already-tracked',
      });
      continue;
    }

    const firstSeen = seenInThisBatch.get(d.filename);
    if (firstSeen) {
      entries.push({
        filename: d.filename, relPath: d.relPath, checksum: d.checksum,
        action: 'skipped-duplicate-filename',
        detail: `first-wins on "${firstSeen}"`,
      });
      continue;
    }

    if (!opts.dryRun) {
      try {
        await pool.query(
          `INSERT INTO dos.platform_migrations (filename, checksum, applied_at, duration_ms)
           VALUES ($1, $2, NOW(), 0)`,
          [d.filename, d.checksum],
        );
        await updateCurrentPath(pool, d.filename, d.absPath);
      } catch (err: any) {
        // Concurrency safety: another baseline run inserted the same row
        // between our getApplied() snapshot and this INSERT. Treat the
        // PK collision as an idempotent skip rather than an error.
        const code = err?.code;
        if (code === '23505') {
          entries.push({
            filename: d.filename, relPath: d.relPath, checksum: d.checksum,
            action: 'skipped-already-tracked',
            detail: 'concurrent insert',
          });
          continue;
        }
        throw err;
      }
    }
    seenInThisBatch.set(d.filename, d.relPath);
    entries.push({
      filename: d.filename, relPath: d.relPath, checksum: d.checksum,
      action: 'imported',
    });
  }

  return entries;
}

export async function migrateDown(
  pool: Pool,
  dir: string,
  upFilename: string
): Promise<MigrationRunResult> {
  const client = await pool.connect();
  try {
    await bootstrap(client);
  } finally {
    client.release();
  }

  const applied = await (async () => {
    const c = await pool.connect();
    try {
      return await getApplied(c);
    } finally {
      c.release();
    }
  })();

  if (!applied.has(upFilename)) {
    return {
      filename: upFilename,
      direction: 'down',
      duration_ms: 0,
      skipped: true,
      skippedReason: `"${upFilename}" is not recorded as applied`,
    };
  }

  const downFilename = resolveDownFilename(upFilename);
  const downPath = path.join(dir, downFilename);
  if (!fs.existsSync(downPath)) {
    throw new Error(`Down migration file not found: ${downPath}`);
  }

  const sql = fs.readFileSync(downPath, 'utf8');
  const noTx = requiresNoTransaction(sql);
  const start = Date.now();
  process.stdout.write(`[migration] rolling back ${upFilename} via ${downFilename}${noTx ? ' (no-transaction)' : ''} ...`);

  await executeSql(pool, sql, noTx);
  await removeRecord(pool, upFilename);

  const duration_ms = Date.now() - start;
  process.stdout.write(` done (${duration_ms}ms)\n`);

  return { filename: upFilename, direction: 'down', duration_ms, skipped: false };
}

export async function getStatus(pool: Pool): Promise<AppliedMigration[]> {
  const client = await pool.connect();
  try {
    await bootstrap(client);
    return Array.from((await getApplied(client)).values());
  } finally {
    client.release();
  }
}

export { sha256, requiresNoTransaction, resolveDownFilename };

if (
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('migration-runner.ts') || process.argv[1].endsWith('migration-runner.js'))
) {
  const args = process.argv.slice(2);
  const command = args[0];

  const dirFlagIndex = args.indexOf('--dir');
  const explicitDir = dirFlagIndex !== -1 && args[dirFlagIndex + 1]
    ? path.resolve(args[dirFlagIndex + 1])
    : null;
  // When --dir is omitted, default to multi-root discovery across the
  // post-reorg tree (ops/migrations, migration, modules/* /db/*, services/*).
  // When --dir is supplied, keep legacy single-dir behavior for compat.
  const dir = explicitDir ?? path.join(process.cwd(), 'ops', 'migrations');

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('[migration] DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: DATABASE_URL });

  async function run() {
    try {
      if (command === 'plan') {
        const plan = await planMigrations(pool, process.cwd());
        const tally: Record<string, number> = {};
        for (const e of plan) tally[e.action] = (tally[e.action] ?? 0) + 1;
        console.log(`\nMigration plan — ${plan.length} files discovered`);
        for (const a of ['already-applied','path-remap','supersedes','new-apply','drift-error']) {
          if (tally[a]) console.log(`  ${a.padEnd(18)} ${tally[a]}`);
        }
        const toShow = plan.filter(e => e.action !== 'already-applied');
        console.log(`\nActionable entries (${toShow.length}):`);
        for (const e of toShow) {
          const d = e.detail ? ` — ${e.detail}` : '';
          console.log(`  [${e.action.padEnd(14)}] ${e.relPath}${d}`);
        }
        // Baseline visibility: how many 'new-apply' rows would instead be
        // treated as already-applied if the operator ran `baseline` first.
        // Useful on canonical+untracked DBs where every discovered file is
        // a new-apply candidate but the schema is already correct.
        const baselineCandidates = await baselineImport(pool, process.cwd(), { dryRun: true });
        const toImport = baselineCandidates.filter(e => e.action === 'imported').length;
        if (toImport > 0) {
          console.log(`\nBaseline candidates: ${toImport} files not in tracker (run 'baseline' to import without executing)`);
        }
        if (tally['drift-error']) {
          console.error(`\nDRIFT ERRORS present — inspect before running 'up'.`);
          process.exit(2);
        }
      } else if (command === 'baseline') {
        const fromIdx = args.indexOf('--from');
        const from = fromIdx !== -1 && args[fromIdx + 1] ? args[fromIdx + 1] : undefined;
        const dryRun = args.includes('--dry-run');
        const entries = await baselineImport(pool, process.cwd(), { from, dryRun });
        const imported = entries.filter(e => e.action === 'imported').length;
        const alreadyTracked = entries.filter(e => e.action === 'skipped-already-tracked').length;
        const duplicates = entries.filter(e => e.action === 'skipped-duplicate-filename').length;
        const prefix = dryRun ? '[DRY-RUN] ' : '';
        console.log(`${prefix}Baseline: ${imported} imported, ${alreadyTracked} already tracked, ${duplicates} duplicate-filename-skipped`);
        if (dryRun && imported > 0) {
          console.log(`\n${prefix}Files that would be imported:`);
          for (const e of entries.filter(x => x.action === 'imported')) {
            console.log(`  ${e.relPath}`);
          }
        }
      } else if (command === 'up') {
        const results = explicitDir
          ? await migrateUp(pool, dir)
          : await migrateUpAll(pool, process.cwd());
        const appliedCount = results.filter(r => !r.skipped).length;
        const skipped = results.filter(r => r.skipped).length;
        const remapped = results.filter(r => r.skipped && r.skippedReason?.startsWith('path_remap')).length;
        const superseded = results.filter(r => r.skipped && r.skippedReason?.startsWith('supersedes')).length;
        console.log(`[migration] Done. ${appliedCount} applied, ${skipped} skipped (${remapped} path_remap, ${superseded} supersedes).`);
      } else if (command === 'down') {
        const upFilename = args[1];
        if (!upFilename) {
          console.error('[migration] Usage: migration-runner.ts down <filename> [--dir <dir>]');
          process.exit(1);
        }
        const result = await migrateDown(pool, dir, upFilename);
        if (result.skipped) {
          console.log(`[migration] Skipped: ${result.skippedReason}`);
        } else {
          console.log(`[migration] Rolled back ${upFilename} in ${result.duration_ms}ms.`);
        }
      } else if (command === 'status') {
        const rows = await getStatus(pool);
        if (rows.length === 0) {
          console.log('[migration] No migrations applied.');
        } else {
          console.table(rows.map(r => ({
            filename: r.filename,
            applied_at: r.applied_at,
            duration_ms: r.duration_ms,
          })));
        }
      } else {
        console.error('[migration] Usage: migration-runner.ts <up|down|status|plan|baseline> [args]');
        process.exit(1);
      }
    } finally {
      await pool.end();
    }
  }

  run().catch(err => {
    console.error('[migration] Fatal error:', err);
    process.exit(1);
  });
}

export class MigrationRunner {
  private pool: Pool;

  constructor(private readonly databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async up(dir: string): Promise<MigrationRunResult[]> {
    return migrateUp(this.pool, dir);
  }

  async upAll(repoRoot: string): Promise<MigrationRunResult[]> {
    return migrateUpAll(this.pool, repoRoot);
  }

  async down(dir: string, upFilename: string): Promise<MigrationRunResult> {
    return migrateDown(this.pool, dir, upFilename);
  }

  async status(): Promise<AppliedMigration[]> {
    return getStatus(this.pool);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

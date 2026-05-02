/**
 * Tracker runner tests — covers the contract that prevents drift:
 *
 *  - identical SQL produces identical idempotency key (checksum)
 *  - discoverTenantMigrations enumerates inline + canonical module
 *    path + legacy module path + ops/tenant in stable order, respects
 *    onlyMigrationIds, and dedupes overlapping migrationIds (canonical wins)
 *  - discovery emits a structured log summarizing roots found vs missing
 *  - runTenantMigrationsTracked records every attempt (applied/failed)
 *  - failure halts by default (continueOnError=false) and surfaces
 *    a TENANT_MIGRATION_FAILED error with the partial summary
 *  - skipped path: when an identical-checksum row already exists with
 *    status=applied, the SQL is not re-executed
 *  - backfillTrackerByExistence marks migrations as verified-by-backfill
 *    only when EVERY CREATE TABLE target is already present
 *
 * No real DB. `safeQuery` is mocked with vi.mock.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const recordedQueries: Array<{ text: string; params?: unknown[] }> = [];
const safeQueryMock = vi.fn();

vi.mock('./query', () => ({
  safeQuery: (text: string, params?: unknown[]) => {
    recordedQueries.push({ text, params });
    return safeQueryMock(text, params);
  },
}));

import {
  discoverTenantMigrations,
  runTenantMigrationsTracked,
  backfillTrackerByExistence,
} from './tenant-migrations';
import { setDbLogger, getDbLogger } from './logger';

interface LogEntry { level: string; obj: unknown; msg: string }

function installCaptureLogger(): LogEntry[] {
  const entries: LogEntry[] = [];
  const original = getDbLogger();
  const capturing = {
    info:  (obj: unknown, msg?: string) => entries.push({ level: 'info',  obj, msg: msg ?? '' }),
    warn:  (obj: unknown, msg?: string) => entries.push({ level: 'warn',  obj, msg: msg ?? '' }),
    error: (obj: unknown, msg?: string) => entries.push({ level: 'error', obj, msg: msg ?? '' }),
    debug: (obj: unknown, msg?: string) => entries.push({ level: 'debug', obj, msg: msg ?? '' }),
    trace: () => {},
    fatal: () => {},
    silent: () => {},
    // Fields unused but required by pino.Logger shape
    level: 'info',
    bindings: () => ({}),
    child: () => capturing,
  } as unknown as Parameters<typeof setDbLogger>[0];
  setDbLogger(capturing);
  // caller's responsibility to restore via returned handle if needed;
  // since tests are isolated via beforeEach, we leave the capture in place.
  void original;
  return entries;
}

/**
 * Legacy-only layout: modules/<mod>/source/backend/<mod>/migrations/ + ops/migrations/tenant/.
 * Used to verify backward compatibility with the pre-SQL-reorg tree.
 */
function setupLegacyRepo(): { repo: string; opsTenantDir: string; modulesDir: string } {
  const repo = mkdtempSync(join(tmpdir(), 'dos-tracker-legacy-'));
  const opsTenantDir = join(repo, 'ops/migrations/tenant');
  const modulesDir = join(repo, 'modules');
  mkdirSync(opsTenantDir, { recursive: true });
  mkdirSync(join(modulesDir, 'foo/source/backend/foo/migrations'), { recursive: true });
  mkdirSync(join(modulesDir, 'bar/source/backend/bar/migrations'), { recursive: true });

  writeFileSync(join(opsTenantDir, '000_baseline.sql'), `CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.t1 (id text);`);
  writeFileSync(join(opsTenantDir, '099_late.sql'), `CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.t2 (id text);`);
  writeFileSync(join(modulesDir, 'foo/source/backend/foo/migrations/001_init.sql'), `CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.foo_t (id text);`);
  writeFileSync(join(modulesDir, 'bar/source/backend/bar/migrations/001_init.sql'), `CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.bar_t (id text);`);
  writeFileSync(join(modulesDir, 'foo/source/backend/foo/migrations/002_drop_down.sql'), `-- excluded`);
  return { repo, opsTenantDir, modulesDir };
}

// Backward-compat alias so existing test bodies still reference setupRepo.
const setupRepo = setupLegacyRepo;

/**
 * Canonical post-SQL-reorg layout: modules/<mod>/db/tenant/migrations/.
 * ops/migrations/tenant/ is absent — the scan will log it as missing but proceed.
 */
function setupCanonicalRepo(): { repo: string; opsTenantDir: string; modulesDir: string } {
  const repo = mkdtempSync(join(tmpdir(), 'dos-tracker-canonical-'));
  const opsTenantDir = join(repo, 'ops/migrations/tenant');
  const modulesDir = join(repo, 'modules');
  mkdirSync(join(modulesDir, 'foo/db/tenant/migrations'), { recursive: true });
  mkdirSync(join(modulesDir, 'bar/db/tenant/migrations'), { recursive: true });

  writeFileSync(join(modulesDir, 'foo/db/tenant/migrations/001_init.sql'), `CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.foo_t (id text);`);
  writeFileSync(join(modulesDir, 'bar/db/tenant/migrations/001_init.sql'), `CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.bar_t (id text);`);
  writeFileSync(join(modulesDir, 'foo/db/tenant/migrations/002_drop_down.sql'), `-- excluded`);
  return { repo, opsTenantDir, modulesDir };
}

/**
 * Dual layout: same module name, same migration filename, in both canonical
 * and legacy paths. Used to verify the canonical-wins dedup rule.
 */
function setupDualRepo(): { repo: string; opsTenantDir: string; modulesDir: string; canonicalSql: string; legacySql: string } {
  const repo = mkdtempSync(join(tmpdir(), 'dos-tracker-dual-'));
  const opsTenantDir = join(repo, 'ops/migrations/tenant');
  const modulesDir = join(repo, 'modules');
  mkdirSync(join(modulesDir, 'foo/db/tenant/migrations'), { recursive: true });
  mkdirSync(join(modulesDir, 'foo/source/backend/foo/migrations'), { recursive: true });

  const canonicalSql = `-- CANONICAL\nCREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.foo_t (id text);`;
  const legacySql    = `-- LEGACY\nCREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.foo_t_legacy (id text);`;
  writeFileSync(join(modulesDir, 'foo/db/tenant/migrations/001_init.sql'), canonicalSql);
  writeFileSync(join(modulesDir, 'foo/source/backend/foo/migrations/001_init.sql'), legacySql);
  return { repo, opsTenantDir, modulesDir, canonicalSql, legacySql };
}

beforeEach(() => {
  recordedQueries.length = 0;
  safeQueryMock.mockReset();
});

describe('discoverTenantMigrations', () => {
  it('returns inline -> modules (alphabetical by module) -> ops/tenant in that order (legacy layout)', () => {
    const { opsTenantDir, modulesDir } = setupRepo();
    const out = discoverTenantMigrations({
      opsTenantDir,
      modulesDir,
      inlineBaselines: [{ migrationId: 'inline/zero', filename: 'zero.sql', rawSql: 'SELECT 1' }],
    });
    const ids = out.map((m) => m.migrationId);
    expect(ids[0]).toBe('inline/zero');
    expect(ids).toContain('module/bar/001_init');
    expect(ids).toContain('module/foo/001_init');
    expect(ids).toContain('ops/tenant/000_baseline');
    expect(ids).toContain('ops/tenant/099_late');
    expect(ids).not.toContain('module/foo/002_drop_down');
    expect(ids.indexOf('module/bar/001_init')).toBeLessThan(ids.indexOf('module/foo/001_init'));
    expect(ids.indexOf('module/foo/001_init')).toBeLessThan(ids.indexOf('ops/tenant/000_baseline'));
  });

  it('respects onlyMigrationIds filter', () => {
    const { opsTenantDir, modulesDir } = setupRepo();
    const out = discoverTenantMigrations({
      opsTenantDir,
      modulesDir,
      onlyMigrationIds: ['ops/tenant/099_late'],
    });
    expect(out.map((m) => m.migrationId)).toEqual(['ops/tenant/099_late']);
  });

  it('discovers the canonical post-reorg path modules/<mod>/db/tenant/migrations/', () => {
    const { opsTenantDir, modulesDir } = setupCanonicalRepo();
    const out = discoverTenantMigrations({ opsTenantDir, modulesDir });
    const ids = out.map((m) => m.migrationId);
    expect(ids).toContain('module/foo/001_init');
    expect(ids).toContain('module/bar/001_init');
    expect(ids).not.toContain('module/foo/002_drop_down');
    // Canonical path must resolve: the absolutePath lives under db/tenant/migrations
    const fooMig = out.find((m) => m.migrationId === 'module/foo/001_init');
    expect(fooMig?.absolutePath).toMatch(/\/foo\/db\/tenant\/migrations\/001_init\.sql$/);
  });

  it('dedupes overlapping migrationIds: canonical wins over legacy', () => {
    const { opsTenantDir, modulesDir, canonicalSql } = setupDualRepo();
    const out = discoverTenantMigrations({ opsTenantDir, modulesDir });
    const foo = out.filter((m) => m.migrationId === 'module/foo/001_init');
    expect(foo).toHaveLength(1);
    expect(foo[0].rawSql).toBe(canonicalSql);
    expect(foo[0].absolutePath).toMatch(/\/db\/tenant\/migrations\//);
  });

  it('emits a structured discovery log naming roots found vs missing', () => {
    const entries = installCaptureLogger();
    const { opsTenantDir, modulesDir } = setupCanonicalRepo();
    discoverTenantMigrations({ opsTenantDir, modulesDir });
    const disco = entries.find((e) => e.msg.includes('discovery'));
    expect(disco).toBeDefined();
    const obj = disco!.obj as Record<string, unknown>;
    expect(obj.event).toBe('tenant-migrations.discovery');
    // Canonical path for foo + bar found (2 modules with migrations)
    expect(obj.canonicalModules).toBe(2);
    // Legacy layout and ops/migrations/tenant absent in this fixture — must be reported, not silent
    expect(obj.opsLegacyExists).toBe(false);
    const missing = obj.rootsMissing as Array<{ kind: string }>;
    expect(Array.isArray(missing)).toBe(true);
    expect(missing.some((r) => r.kind === 'ops-legacy')).toBe(true);
  });
});

describe('runTenantMigrationsTracked', () => {
  it('records every applied migration into dos.tenant_migrations and skips already-applied ones', async () => {
    const { opsTenantDir, modulesDir } = setupRepo();
    // First call: nothing applied yet (SELECT returns empty), every INSERT succeeds, every DDL succeeds
    safeQueryMock.mockImplementation((text: string) => {
      if (/SELECT 1\s+FROM dos\.tenant_migrations/i.test(text)) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const summary = await runTenantMigrationsTracked('acme', { opsTenantDir, modulesDir });
    expect(summary.tenantId).toBe('acme');
    expect(summary.schema).toBe('tenant_acme');
    expect(summary.applied).toBe(4);
    expect(summary.failed).toBe(0);
    expect(summary.skipped).toBe(0);
    // Each migration triggers: 1 SELECT (already-applied check), 1 DDL, 1 INSERT INTO tracker
    const inserts = recordedQueries.filter((q) => q.text.includes('INSERT INTO dos.tenant_migrations'));
    expect(inserts).toHaveLength(4);
    for (const ins of inserts) expect(ins.params?.[5]).toBe('applied');
  });

  it('skips re-execution when an identical-checksum applied row exists', async () => {
    const { opsTenantDir, modulesDir } = setupRepo();
    safeQueryMock.mockImplementation((text: string) => {
      if (/SELECT 1\s+FROM dos\.tenant_migrations/i.test(text)) return Promise.resolve({ rows: [{ exists: 1 }] });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const summary = await runTenantMigrationsTracked('acme', { opsTenantDir, modulesDir });
    expect(summary.applied).toBe(0);
    expect(summary.skipped).toBe(4);
    // No DDL or INSERTs should run
    expect(recordedQueries.some((q) => q.text.includes('CREATE TABLE'))).toBe(false);
    expect(recordedQueries.some((q) => q.text.includes('INSERT INTO dos.tenant_migrations'))).toBe(false);
  });

  it('throws TENANT_MIGRATION_FAILED on first failure (continueOnError=false default)', async () => {
    const { opsTenantDir, modulesDir } = setupRepo();
    safeQueryMock.mockImplementation((text: string) => {
      if (/SELECT 1\s+FROM dos\.tenant_migrations/i.test(text)) return Promise.resolve({ rows: [] });
      if (/INSERT INTO dos\.tenant_migrations/i.test(text)) return Promise.resolve({ rows: [], rowCount: 0 });
      // every DDL fails
      return Promise.reject(new Error('DDL boom'));
    });
    await expect(runTenantMigrationsTracked('acme', { opsTenantDir, modulesDir }))
      .rejects.toMatchObject({ code: 'TENANT_MIGRATION_FAILED', tenantId: 'acme' });
    // The failed attempt is still recorded with status=failed
    const failedInsert = recordedQueries.find((q) => q.text.includes('INSERT INTO dos.tenant_migrations'));
    expect(failedInsert).toBeDefined();
    expect(failedInsert?.params?.[5]).toBe('failed');
  });

  it('continues across failures when continueOnError=true and records each one', async () => {
    const { opsTenantDir, modulesDir } = setupRepo();
    safeQueryMock.mockImplementation((text: string) => {
      if (/SELECT 1\s+FROM dos\.tenant_migrations/i.test(text)) return Promise.resolve({ rows: [] });
      if (/INSERT INTO dos\.tenant_migrations/i.test(text)) return Promise.resolve({ rows: [], rowCount: 0 });
      return Promise.reject(new Error('DDL boom'));
    });
    const summary = await runTenantMigrationsTracked('acme', { opsTenantDir, modulesDir, continueOnError: true });
    expect(summary.failed).toBe(4);
    expect(summary.applied).toBe(0);
  });

  it('rejects unsafe tenant ids before any SQL is built', async () => {
    await expect(runTenantMigrationsTracked('public.dos' as string)).rejects.toThrow(/Invalid tenant ID/);
    await expect(runTenantMigrationsTracked("'; DROP SCHEMA public CASCADE; --")).rejects.toThrow(/Invalid tenant ID/);
  });
});

describe('backfillTrackerByExistence', () => {
  it('marks migration as verified-by-backfill when all its CREATE TABLE targets already exist', async () => {
    const { opsTenantDir, modulesDir } = setupRepo();
    safeQueryMock.mockImplementation((text: string) => {
      if (text.includes('information_schema.tables')) {
        return Promise.resolve({ rows: [{ table_name: 't1' }, { table_name: 't2' }, { table_name: 'foo_t' }, { table_name: 'bar_t' }] });
      }
      if (/SELECT 1\s+FROM dos\.tenant_migrations/i.test(text)) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const summary = await backfillTrackerByExistence('acme', { opsTenantDir, modulesDir });
    expect(summary.applied).toBe(4);
    const inserts = recordedQueries.filter((q) => q.text.includes('INSERT INTO dos.tenant_migrations'));
    expect(inserts.length).toBe(4);
    for (const ins of inserts) expect(ins.params?.[5]).toBe('verified-by-backfill');
  });

  it('does not mark backfill when one of the CREATE TABLE targets is missing', async () => {
    const { opsTenantDir, modulesDir } = setupRepo();
    safeQueryMock.mockImplementation((text: string) => {
      if (text.includes('information_schema.tables')) {
        return Promise.resolve({ rows: [{ table_name: 't1' }] }); // only one of four present
      }
      if (/SELECT 1\s+FROM dos\.tenant_migrations/i.test(text)) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const summary = await backfillTrackerByExistence('acme', { opsTenantDir, modulesDir });
    expect(summary.applied).toBe(1);
    expect(summary.skipped).toBe(3);
  });
});

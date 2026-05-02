import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import {
  sha256,
  requiresNoTransaction,
  resolveDownFilename,
  migrateUp,
  migrateDown,
  getStatus,
  baselineImport,
} from '../../migration/migration-runner.js';

// ---------------------------------------------------------------------------
// Pure-logic unit tests (no DB required)
// ---------------------------------------------------------------------------

describe('sha256', () => {
  it('returns a 64-char hex string', () => {
    const hash = sha256('hello');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', () => {
    expect(sha256('content')).toBe(sha256('content'));
  });

  it('changes when content changes', () => {
    expect(sha256('a')).not.toBe(sha256('b'));
  });
});

describe('requiresNoTransaction', () => {
  it('returns false for ordinary DDL', () => {
    expect(requiresNoTransaction('CREATE TABLE foo (id INT);')).toBe(false);
  });

  it('returns true when CONCURRENTLY keyword present', () => {
    expect(requiresNoTransaction('CREATE INDEX CONCURRENTLY idx ON t(col);')).toBe(true);
  });

  it('is case-insensitive for CONCURRENTLY', () => {
    expect(requiresNoTransaction('CREATE INDEX concurrently idx ON t(col);')).toBe(true);
  });

  it('returns true for -- dos:no-transaction header', () => {
    expect(requiresNoTransaction('-- dos:no-transaction\nCREATE TABLE foo (id INT);')).toBe(true);
  });

  it('is case-insensitive for dos:no-transaction', () => {
    expect(requiresNoTransaction('-- DOS:NO-TRANSACTION\nSELECT 1;')).toBe(true);
  });

  it('ignores dos:no-transaction when beyond 512 chars into the file', () => {
    const padding = 'x'.repeat(600);
    expect(requiresNoTransaction(`-- ${padding}\n-- dos:no-transaction\nSELECT 1;`)).toBe(false);
  });
});

describe('resolveDownFilename', () => {
  it('converts _up.sql to _down.sql', () => {
    expect(resolveDownFilename('20260418_0001_foo_up.sql')).toBe('20260418_0001_foo_down.sql');
  });

  it('appends _down to plain .sql files', () => {
    expect(resolveDownFilename('20260418_0001_foo.sql')).toBe('20260418_0001_foo_down.sql');
  });
});

// ---------------------------------------------------------------------------
// Integration tests (require DATABASE_URL pointing to a live Postgres instance)
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL;

async function canReachDatabase(url: string): Promise<boolean> {
  const p = new Pool({ connectionString: url, connectionTimeoutMillis: 3000 });
  try {
    const client = await p.connect();
    client.release();
    return true;
  } catch {
    return false;
  } finally {
    await p.end();
  }
}

const dbReachable = DATABASE_URL ? await canReachDatabase(DATABASE_URL) : false;
const integrationDescribe = dbReachable ? describe : describe.skip;

integrationDescribe('migration runner integration', () => {
  let pool: Pool;
  let tmpDir: string;

  function writeSql(filename: string, content: string) {
    fs.writeFileSync(path.join(tmpDir, filename), content, 'utf8');
  }

  // Build a throwaway repoRoot shaped like the real monorepo so that
  // discoverAllMigrations finds the files we write under it. Only the
  // roots the runner walks need to exist (ops/migrations by default).
  function makeRepoRoot(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dos-migration-repo-'));
    fs.mkdirSync(path.join(root, 'ops', 'migrations'), { recursive: true });
    return root;
  }

  function writeSqlAt(repoRoot: string, relDir: string, filename: string, content: string) {
    const dir = path.join(repoRoot, relDir);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), content, 'utf8');
  }

  async function cleanPlatformMigrations() {
    await pool.query(
      `DELETE FROM dos.platform_migrations WHERE filename LIKE 'test_%'`
    );
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL! });
    const client = await pool.connect();
    try {
      await client.query(`CREATE SCHEMA IF NOT EXISTS dos`);
      await client.query(`
        CREATE TABLE IF NOT EXISTS dos.platform_migrations (
          filename    TEXT        NOT NULL PRIMARY KEY,
          checksum    TEXT        NOT NULL,
          applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          duration_ms INTEGER     NOT NULL
        )
      `);
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    await cleanPlatformMigrations();
    await pool.end();
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dos-migration-test-'));
  });

  afterEach(async () => {
    await cleanPlatformMigrations();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('idempotency — applying the same migration twice skips the second run', async () => {
    writeSql('test_001_idempotent.sql', `CREATE TABLE IF NOT EXISTS dos._test_idempotent_${Date.now()} (id INT);`);

    const first = await migrateUp(pool, tmpDir);
    expect(first).toHaveLength(1);
    expect(first[0].skipped).toBe(false);

    const second = await migrateUp(pool, tmpDir);
    expect(second).toHaveLength(1);
    expect(second[0].skipped).toBe(true);
    expect(second[0].skippedReason).toMatch(/already applied/);
  });

  it('checksum drift — fails fast when an applied file is modified', async () => {
    const filePath = path.join(tmpDir, 'test_002_drift.sql');
    fs.writeFileSync(filePath, 'SELECT 1;', 'utf8');

    await migrateUp(pool, tmpDir);

    fs.writeFileSync(filePath, 'SELECT 2;', 'utf8');

    await expect(migrateUp(pool, tmpDir)).rejects.toThrow(/Checksum drift detected/);
  });

  it('down rollback — executes _down.sql and removes tracking row', async () => {
    const tag = Date.now();
    // Up file must NOT end with `_down.sql` — collectUpFiles filters those
    // out so that `<name>_down.sql` is always treated as the rollback
    // companion, never as a forward migration.
    writeSql('test_003_rollback.sql', `CREATE TABLE IF NOT EXISTS dos._test_down_${tag} (id INT);`);
    writeSql('test_003_rollback_down.sql', `DROP TABLE IF EXISTS dos._test_down_${tag};`);

    await migrateUp(pool, tmpDir);

    const statusBefore = await getStatus(pool);
    expect(statusBefore.some(r => r.filename === 'test_003_rollback.sql')).toBe(true);

    const result = await migrateDown(pool, tmpDir, 'test_003_rollback.sql');
    expect(result.skipped).toBe(false);
    expect(result.direction).toBe('down');

    const statusAfter = await getStatus(pool);
    expect(statusAfter.some(r => r.filename === 'test_003_rollback.sql')).toBe(false);
  });

  it('down on non-applied migration is skipped gracefully', async () => {
    writeSql('test_004_notapplied.sql', 'SELECT 1;');
    writeSql('test_004_notapplied_down.sql', 'SELECT 1;');

    const result = await migrateDown(pool, tmpDir, 'test_004_notapplied.sql');
    expect(result.skipped).toBe(true);
    expect(result.skippedReason).toMatch(/not recorded as applied/);
  });

  it('CONCURRENTLY path — migration with CONCURRENTLY keyword is executed without transaction wrapper', async () => {
    const tag = Date.now();
    writeSql(
      'test_005_concurrently.sql',
      `-- dos:no-transaction\nDROP INDEX IF EXISTS dos._test_idx_${tag};\nCREATE INDEX CONCURRENTLY _test_idx_${tag} ON dos.platform_migrations(filename);`
    );
    writeSql('test_005_concurrently_down.sql', `DROP INDEX IF EXISTS _test_idx_${tag};`);

    const results = await migrateUp(pool, tmpDir);
    expect(results).toHaveLength(1);
    expect(results[0].skipped).toBe(false);

    const status = await getStatus(pool);
    expect(status.some(r => r.filename === 'test_005_concurrently.sql')).toBe(true);
  }, 30_000);

  it('getStatus returns correct filename, checksum, duration_ms columns', async () => {
    writeSql('test_006_status.sql', 'SELECT 1;');

    await migrateUp(pool, tmpDir);
    const rows = await getStatus(pool);
    const row = rows.find(r => r.filename === 'test_006_status.sql');

    expect(row).toBeDefined();
    expect(row!.checksum).toHaveLength(64);
    expect(typeof row!.duration_ms).toBe('number');
    expect(row!.applied_at).toBeInstanceOf(Date);
  });

  it('migrations are applied in lexicographic order', async () => {
    writeSql('test_007_b.sql', 'SELECT 2;');
    writeSql('test_007_a.sql', 'SELECT 1;');
    writeSql('test_007_c.sql', 'SELECT 3;');

    const results = await migrateUp(pool, tmpDir);
    const filenames = results.map(r => r.filename);
    expect(filenames).toEqual(['test_007_a.sql', 'test_007_b.sql', 'test_007_c.sql']);
  });

  // ── Phase 5 follow-up — SQL parity proof ──────────────────────────
  // The in-house splitter in migration/migration-runner.ts must cope
  // with every construct that real migrations use. Each case below
  // exercises a SQL surface the release-gate migrations actually use
  // (see ops/migrations/*.sql + services/*/migrations/*.sql).

  it('DO $$ … $$ block with internal semicolons applies as one statement', async () => {
    const tag = Date.now();
    writeSql('test_008_do_block.sql', `
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS dos._test_do_${tag} (id INT);
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='dos' AND table_name='_test_do_${tag}' AND column_name='name') THEN
    ALTER TABLE dos._test_do_${tag} ADD COLUMN name TEXT;
  END IF;
END
$$;
`);
    const results = await migrateUp(pool, tmpDir);
    expect(results[0].skipped).toBe(false);

    const cols = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema='dos' AND table_name = $1`,
      [`_test_do_${tag}`],
    );
    expect(cols.rows.map(r => r.column_name).sort()).toEqual(['id', 'name']);
    // secrets-scan-allow: fixture cleanup; tag is Date.now() integer under test control.
    await pool.query(`DROP TABLE IF EXISTS dos._test_do_${tag}`);
  });

  it('CREATE FUNCTION with dollar-quoted body + internal semicolons applies cleanly', async () => {
    const tag = Date.now();
    writeSql('test_009_function.sql', `
CREATE OR REPLACE FUNCTION dos._test_fn_${tag}(x INT) RETURNS INT AS $body$
DECLARE
  result INT;
BEGIN
  result := x * 2;
  RETURN result;
END;
$body$ LANGUAGE plpgsql;
`);
    const results = await migrateUp(pool, tmpDir);
    expect(results[0].skipped).toBe(false);

    // secrets-scan-allow: fixture call; tag is Date.now() integer under test control.
    const { rows } = await pool.query(`SELECT dos._test_fn_${tag}(21) AS n`);
    expect(rows[0].n).toBe(42);
    // secrets-scan-allow: fixture cleanup; tag is Date.now() integer under test control.
    await pool.query(`DROP FUNCTION IF EXISTS dos._test_fn_${tag}(INT)`);
  });

  it('Line comments with semicolons inside do not split the statement', async () => {
    const tag = Date.now();
    writeSql('test_010_comment_semicolons.sql', `
-- This comment has; semicolons; inside; but they must not split
CREATE TABLE IF NOT EXISTS dos._test_cmt_${tag} (
  -- here too; another; semi;
  id INT,
  note TEXT /* block /* nested */ comment; with; semi; */
);
`);
    const results = await migrateUp(pool, tmpDir);
    expect(results[0].skipped).toBe(false);

    const cols = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema='dos' AND table_name = $1`,
      [`_test_cmt_${tag}`],
    );
    expect(cols.rows.map(r => r.column_name).sort()).toEqual(['id', 'note']);
    // secrets-scan-allow: fixture cleanup; tag is Date.now() integer under test control.
    await pool.query(`DROP TABLE IF EXISTS dos._test_cmt_${tag}`);
  });

  it('Transactional migration (no CONCURRENTLY, no no-transaction header) runs inside BEGIN/COMMIT', async () => {
    const tag = Date.now();
    writeSql('test_011_txn.sql', `
CREATE TABLE IF NOT EXISTS dos._test_txn_${tag} (id INT);
INSERT INTO dos._test_txn_${tag}(id) VALUES (1), (2), (3);
`);
    const results = await migrateUp(pool, tmpDir);
    expect(results[0].skipped).toBe(false);
    // secrets-scan-allow: fixture read; tag is Date.now() integer under test control.
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS c FROM dos._test_txn_${tag}`);
    expect(rows[0].c).toBe(3);
    // secrets-scan-allow: fixture cleanup; tag is Date.now() integer under test control.
    await pool.query(`DROP TABLE IF EXISTS dos._test_txn_${tag}`);
  });

  it('CONCURRENTLY + DROP INDEX IF EXISTS combo runs outside any implicit transaction', async () => {
    // Regression guard for the Phase 4.6 splitter fix — Postgres treats
    // a multi-statement simple-query batch as an implicit transaction,
    // which made `CREATE INDEX CONCURRENTLY` fail alongside any other
    // statement. The splitter must run them as separate query cycles.
    const tag = Date.now();
    writeSql(
      'test_012_concurrently_combo.sql',
      `-- dos:no-transaction
DROP INDEX IF EXISTS dos._test_combo_idx_${tag};
CREATE INDEX CONCURRENTLY _test_combo_idx_${tag} ON dos.platform_migrations(filename);
`,
    );
    const results = await migrateUp(pool, tmpDir);
    expect(results[0].skipped).toBe(false);
    const { rows } = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE indexname = $1`,
      [`_test_combo_idx_${tag}`],
    );
    expect(rows.length).toBe(1);
    // secrets-scan-allow: fixture cleanup; tag is Date.now() integer under test control.
    await pool.query(`DROP INDEX IF EXISTS dos._test_combo_idx_${tag}`);
  });

  // ── Baseline-import (PR-1) ──────────────────────────────────────────
  // These tests use makeRepoRoot() instead of the flat tmpDir because
  // baselineImport walks the canonical discovery roots relative to a
  // repo root. Each test builds its own throwaway repo.

  describe('baselineImport', () => {
    let repoRoot: string;

    beforeEach(() => {
      repoRoot = makeRepoRoot();
    });

    afterEach(() => {
      fs.rmSync(repoRoot, { recursive: true, force: true });
    });

    it('imports every discovered file when tracker has no matching rows', async () => {
      const tag = Date.now();
      writeSqlAt(repoRoot, 'ops/migrations', `test_baseline_${tag}_a.sql`, 'SELECT 1;');
      writeSqlAt(repoRoot, 'ops/migrations', `test_baseline_${tag}_b.sql`, 'SELECT 2;');

      const entries = await baselineImport(pool, repoRoot);
      const imported = entries.filter(e => e.action === 'imported');
      expect(imported.map(e => e.filename).sort()).toEqual([
        `test_baseline_${tag}_a.sql`,
        `test_baseline_${tag}_b.sql`,
      ]);

      const { rows } = await pool.query(
        `SELECT filename, duration_ms FROM dos.platform_migrations
         WHERE filename LIKE $1 ORDER BY filename`,
        [`test_baseline_${tag}_%`],
      );
      expect(rows).toHaveLength(2);
      expect(rows.every(r => r.duration_ms === 0)).toBe(true);
    });

    it('is idempotent — re-running emits skipped-already-tracked and preserves applied_at', async () => {
      const tag = Date.now();
      writeSqlAt(repoRoot, 'ops/migrations', `test_baseline_${tag}_idem.sql`, 'SELECT 1;');

      await baselineImport(pool, repoRoot);
      const firstRow = await pool.query(
        `SELECT applied_at FROM dos.platform_migrations WHERE filename = $1`,
        [`test_baseline_${tag}_idem.sql`],
      );
      expect(firstRow.rows).toHaveLength(1);
      const firstAppliedAt = firstRow.rows[0].applied_at;

      const entries = await baselineImport(pool, repoRoot);
      const skipped = entries.find(e => e.filename === `test_baseline_${tag}_idem.sql`);
      expect(skipped?.action).toBe('skipped-already-tracked');

      const secondRow = await pool.query(
        `SELECT applied_at FROM dos.platform_migrations WHERE filename = $1`,
        [`test_baseline_${tag}_idem.sql`],
      );
      expect(secondRow.rows[0].applied_at.getTime()).toBe(firstAppliedAt.getTime());
    });

    it('--dry-run writes nothing to the tracker', async () => {
      const tag = Date.now();
      writeSqlAt(repoRoot, 'ops/migrations', `test_baseline_${tag}_dry.sql`, 'SELECT 1;');

      const entries = await baselineImport(pool, repoRoot, { dryRun: true });
      expect(entries.find(e => e.filename === `test_baseline_${tag}_dry.sql`)?.action).toBe('imported');

      const { rows } = await pool.query(
        `SELECT 1 FROM dos.platform_migrations WHERE filename = $1`,
        [`test_baseline_${tag}_dry.sql`],
      );
      expect(rows).toHaveLength(0);
    });

    it('--from scopes import to a single discovery root', async () => {
      const tag = Date.now();
      writeSqlAt(repoRoot, 'ops/migrations',          `test_baseline_${tag}_in.sql`,  'SELECT 1;');
      writeSqlAt(repoRoot, 'migration',               `test_baseline_${tag}_out.sql`, 'SELECT 2;');

      const entries = await baselineImport(pool, repoRoot, { from: 'ops/migrations' });
      const imported = entries.filter(e => e.action === 'imported').map(e => e.filename);
      expect(imported).toContain(`test_baseline_${tag}_in.sql`);
      expect(imported).not.toContain(`test_baseline_${tag}_out.sql`);

      const { rows } = await pool.query(
        `SELECT filename FROM dos.platform_migrations WHERE filename LIKE $1`,
        [`test_baseline_${tag}_%`],
      );
      expect(rows.map(r => r.filename)).toEqual([`test_baseline_${tag}_in.sql`]);
    });

    it('duplicate filename across roots — first-wins matches discovery sort (by relPath)', async () => {
      const tag = Date.now();
      // discoverAllMigrations final sort is byName then byRelPath.localeCompare,
      // so for identical filenames the lexicographically lower relPath wins.
      // "migration/..." < "ops/migrations/..." so the migration/ copy wins.
      writeSqlAt(repoRoot, 'ops/migrations', `test_baseline_${tag}_dup.sql`, 'SELECT 1;');
      writeSqlAt(repoRoot, 'migration',      `test_baseline_${tag}_dup.sql`, 'SELECT 2;');

      const entries = await baselineImport(pool, repoRoot);
      const forThisFile = entries.filter(e => e.filename === `test_baseline_${tag}_dup.sql`);
      expect(forThisFile).toHaveLength(2);

      const imported = forThisFile.find(e => e.action === 'imported');
      const skipped  = forThisFile.find(e => e.action === 'skipped-duplicate-filename');
      expect(imported).toBeDefined();
      expect(skipped).toBeDefined();
      // Robust invariant: winner's relPath is lexicographically less than loser's.
      expect(imported!.relPath.localeCompare(skipped!.relPath)).toBeLessThan(0);
      expect(skipped!.detail).toContain(`first-wins on "${imported!.relPath}"`);

      const { rows } = await pool.query(
        `SELECT filename FROM dos.platform_migrations WHERE filename = $1`,
        [`test_baseline_${tag}_dup.sql`],
      );
      expect(rows).toHaveLength(1);
    });
  });
});

#!/usr/bin/env node
/**
 * reconcile-migration-drift.mjs
 *
 * For every applied migration whose recorded checksum no longer matches
 * the canonical file's current SHA-256:
 *   1. strip any `-- dos:supersedes-checksum:` header that we may have
 *      previously prepended (so the file's hash returns to its true
 *      content-only value),
 *   2. UPDATE dos.platform_migrations SET checksum=<current> so the
 *      recorded sum matches the canonical file going forward.
 *
 * This is the explicit "I accept these post-apply edits as the new
 * baseline" tool. It MUST only be run after human review.
 *
 * Usage:
 *   PGPASSWORD=… node scripts/ops/reconcile-migration-drift.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';

const REPO = path.resolve(decodeURI(new URL('.', import.meta.url).pathname), '..', '..');
const DRY = process.argv.includes('--dry');

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'archive', 'dist', '.stryker-tmp', '_sources',
]);

const ROOTS = [
  path.join(REPO, 'ops', 'migrations'),
  path.join(REPO, 'platform'),
  path.join(REPO, 'modules'),
  path.join(REPO, 'services'),
  path.join(REPO, 'migration'),
];

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith('.sql') && !entry.name.endsWith('_down.sql')) yield full;
  }
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

const HEADER_LINE_RE = /^--\s*dos:supersedes-checksum:\s*[0-9a-f]{64}\s*\n/i;

async function main() {
  const url = process.env.DATABASE_URL
    || `postgresql://dos_migrator:${process.env.PGPASSWORD || 'postgres'}@localhost:5432/shahin_grc`;
  const pool = new pg.Pool({ connectionString: url });
  const { rows } = await pool.query(
    `SELECT filename, checksum FROM dos.platform_migrations`,
  );
  const applied = new Map(rows.map(r => [r.filename, r.checksum]));

  // Map filename → latest abs path on disk (last-wins is fine; the
  // discoverer dedups by full relpath, but here filename is the PK).
  const byFilename = new Map();
  for (const root of ROOTS) {
    for (const abs of walk(root)) {
      const sql = fs.readFileSync(abs, 'utf8');
      if (sql.includes('__TENANT_SCHEMA__')) continue;
      byFilename.set(path.basename(abs), abs);
    }
  }

  let updates = 0;
  for (const [filename, recorded] of applied) {
    const abs = byFilename.get(filename);
    if (!abs) continue;
    let sql = fs.readFileSync(abs, 'utf8');
    let stripped = false;
    if (HEADER_LINE_RE.test(sql)) {
      sql = sql.replace(HEADER_LINE_RE, '');
      stripped = true;
    }
    const current = sha256(sql);
    if (current === recorded && !stripped) continue;
    console.log(
      `${DRY ? '[dry] ' : ''}reconcile ${filename} ` +
      `${recorded.slice(0, 12)}… -> ${current.slice(0, 12)}…` +
      (stripped ? ' (header stripped)' : ''),
    );
    if (!DRY) {
      if (stripped) fs.writeFileSync(abs, sql);
      await pool.query(
        `UPDATE dos.platform_migrations SET checksum=$1 WHERE filename=$2`,
        [current, filename],
      );
    }
    updates++;
  }
  await pool.end();
  console.log(`\nrows ${DRY ? 'would be ' : ''}updated: ${updates}`);
}

main().catch(err => { console.error(err); process.exit(1); });

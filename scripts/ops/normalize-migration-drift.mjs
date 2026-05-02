#!/usr/bin/env node
/**
 * normalize-migration-drift.mjs
 *
 * Walks the migration roots and, for every .sql file whose current SHA-256
 * disagrees with the recorded checksum in dos.platform_migrations, prepends
 * a `-- dos:supersedes-checksum: <recorded>` header so the migration runner
 * recognises the file as a re-baseline rather than throwing checksum drift.
 *
 * Idempotent: skips files that already carry the correct supersedes header.
 *
 * Usage:
 *   PGPASSWORD=… node scripts/ops/normalize-migration-drift.mjs [--dry]
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

const HEADER_RE = /^--\s*dos:supersedes-checksum:\s*([0-9a-f]{64})\s*$/im;

async function main() {
  const url = process.env.DATABASE_URL
    || `postgresql://dos_migrator:${process.env.PGPASSWORD || 'postgres'}@localhost:5432/shahin_grc`;
  const pool = new pg.Pool({ connectionString: url });
  const { rows } = await pool.query(
    `SELECT filename, checksum FROM dos.platform_migrations`,
  );
  const applied = new Map(rows.map(r => [r.filename, r.checksum]));
  await pool.end();

  let touched = 0;
  for (const root of ROOTS) {
    for (const abs of walk(root)) {
      const filename = path.basename(abs);
      const recorded = applied.get(filename);
      if (!recorded) continue;
      const sql = fs.readFileSync(abs, 'utf8');
      // ignore tenant templates
      if (sql.includes('__TENANT_SCHEMA__')) continue;
      const current = sha256(sql);
      if (current === recorded) continue;
      // already-stamped?
      const m = sql.match(HEADER_RE);
      if (m && m[1] === recorded) continue;
      const header = `-- dos:supersedes-checksum: ${recorded}\n`;
      const next = header + sql;
      console.log(`${DRY ? '[dry] ' : ''}stamp ${path.relative(REPO, abs)} <- ${recorded.slice(0, 12)}…`);
      if (!DRY) fs.writeFileSync(abs, next);
      touched++;
    }
  }
  console.log(`\nfiles ${DRY ? 'would be ' : ''}stamped: ${touched}`);
}

main().catch(err => { console.error(err); process.exit(1); });

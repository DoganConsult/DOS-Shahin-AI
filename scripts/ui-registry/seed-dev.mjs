#!/usr/bin/env node
/**
 * pnpm ui-registry:seed:dev — Phase F dev-DB applier.
 *
 * Runs `import.mjs --dry` to compute the canonical seed SQL, then pipes it
 * into psql against the local dev `shahin_grc` DB. Read-only against source
 * code; the only mutation is on the live DB. Skips gracefully if psql is
 * unavailable.
 *
 * Env (with defaults matching AGENTS.md VERIFIED ENVIRONMENT FACTS):
 *   PGHOST=localhost PGPORT=5432 PGDATABASE=shahin_grc
 *   PGUSER=dos_auth  PGPASSWORD=dos_auth_pass_2026
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const importer = join(REPO, 'scripts/ui-registry/import.mjs');

const env = {
  ...process.env,
  PGHOST: process.env.PGHOST ?? 'localhost',
  PGPORT: process.env.PGPORT ?? '5432',
  PGDATABASE: process.env.PGDATABASE ?? 'shahin_grc',
  PGUSER: process.env.PGUSER ?? 'dos_auth',
  PGPASSWORD: process.env.PGPASSWORD ?? 'dos_auth_pass_2026',
};

const dry = spawnSync(process.execPath, [importer, '--dry'], { encoding: 'utf8' });
if (dry.status !== 0) {
  console.error('[ui-registry:seed:dev] importer failed:\n' + (dry.stderr || ''));
  process.exit(dry.status ?? 1);
}
const sql = dry.stdout;

const which = spawnSync('which', ['psql'], { encoding: 'utf8' });
if (which.status !== 0) {
  console.error('[ui-registry:seed:dev] psql not found on PATH — printing SQL only');
  process.stdout.write(sql);
  process.exit(0);
}

const psql = spawnSync('psql', ['-v','ON_ERROR_STOP=1','-X','-q','-f','-'], {
  input: sql, env, encoding: 'utf8',
});
process.stdout.write(psql.stdout || '');
process.stderr.write(psql.stderr || '');
if (psql.status !== 0) {
  console.error(`[ui-registry:seed:dev] psql exited ${psql.status}`);
  process.exit(psql.status ?? 1);
}
console.log('[ui-registry:seed:dev] applied to ' + env.PGDATABASE);

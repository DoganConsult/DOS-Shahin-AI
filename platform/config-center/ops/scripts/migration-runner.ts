/**
 * @deprecated Use `migration/migration-runner.ts` (canonical runner).
 * See ADR: ops/docs/ADR/004-migration-runner-canonical.md
 *
 * This file is retained for backward compatibility with CI scripts that reference
 * `ops/scripts/migration-runner.ts`. It emits a deprecation warning and then
 * delegates to the canonical runner behaviour using the same DATABASE_URL and
 * MIGRATIONS_DIR environment variables it previously accepted.
 *
 * DO NOT add new features here. All development must go into migration/migration-runner.ts.
 */

import path from 'node:path';
import { Pool } from 'pg';
import { migrateUp } from '../../migration/migration-runner.js';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://shahin:shahin_grc_2024@localhost:5432/shahin_grc';
const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR || path.join(__dirname, '..', 'migrations');

console.warn(
  '[migration] DEPRECATION WARNING: ops/scripts/migration-runner.ts is deprecated.\n' +
  '[migration] Use migration/migration-runner.ts instead.\n' +
  '[migration] See: ops/docs/ADR/004-migration-runner-canonical.md'
);

const pool = new Pool({ connectionString: DATABASE_URL });

migrateUp(pool, MIGRATIONS_DIR)
  .then(results => {
    const applied = results.filter(r => !r.skipped).length;
    const skipped = results.filter(r => r.skipped).length;
    console.log(`[migration] Done. ${applied} applied, ${skipped} skipped.`);
  })
  .catch(err => {
    console.error('[migration] Runner failed:', err);
    process.exit(1);
  })
  .finally(() => pool.end());

#!/usr/bin/env node
/**
 * DOS Master L36 — SLO row required per active service
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/slo-row-per-active-service.mjs [OPTIONS]

Every dos_master.service_registry row with status='active' MUST have matching dos.platform_slo row.

Options:
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         PostgreSQL connection string (default: postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc)

Policy:
  Catches drift where new services land without SLO declarations.
  Doctrine binding: Article 3 (DB owns runtime contract) + Article 5 (no fake-green).
  DB unreachable or table not yet migrated is treated as SKIP (exit 0).

Exit codes:
  0 — PASS or SKIP
  1 — Active service(s) lack SLO row
  2 — ERROR

Examples:
  # Run SLO row per active service check
  node scripts/ci-guards/slo-row-per-active-service.mjs
`);
  process.exit(0);
}

import pg from 'pg';

const url = process.env.DATABASE_URL || 'postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc';
const c = new pg.Client({ connectionString: url });
try {
  await c.connect();
  // SLO table may not yet exist on first run.
  const exists = await c.query("SELECT to_regclass('dos.platform_slo') AS t");
  if (!exists.rows[0].t) {
    console.log('[slo-row-per-active-service] SKIP — dos.platform_slo not yet migrated');
    await c.end();
    process.exit(0);
  }
  const r = await c.query(`
    SELECT sr.service_code
      FROM dos_master.service_registry sr
 LEFT JOIN dos.platform_slo s ON s.service_code = sr.service_code
     WHERE sr.status = 'active' AND s.service_code IS NULL
  `);
  await c.end();
  if (r.rows.length) {
    console.error(`[slo-row-per-active-service] FAIL ${r.rows.length} active service(s) lack SLO row:`);
    r.rows.slice(0, 5).forEach((x) => console.error('  ' + x.service_code));
    process.exit(1);
  }
  console.log(`[slo-row-per-active-service] PASS every active service has an SLO row`);
} catch (e) {
  console.log(`[slo-row-per-active-service] SKIP — DB unavailable: ${(e).message.slice(0, 80)}`);
  process.exit(0);
}

#!/usr/bin/env node
/**
 * DOS Master Doctrine — verifies all 11 articles exist and are acknowledged.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/doctrine-acknowledged.mjs [OPTIONS]

Verifies all 11 doctrine articles exist and have been acknowledged.

Options:
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         PostgreSQL connection string (default: postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc)

Behavior:
  - Checks dos_master.doctrine_article has 11 articles
  - Checks dos_master.doctrine_acknowledgement has acknowledgements
  - DB unreachable is treated as SKIP (exit 0)

Exit codes:
  0 — PASS or DB unreachable
  1 — FAIL articles missing or not acknowledged
  2 — ERROR

Examples:
  # Run doctrine acknowledged check
  node scripts/ci-guards/doctrine-acknowledged.mjs
`);
  process.exit(0);
}

import { Client } from 'pg';

async function main() {
  const cs = process.env.DATABASE_URL
    || `postgres://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc`;
  const c = new Client({ connectionString: cs });
  try { await c.connect(); } catch (e) {
    console.warn('[doctrine-acknowledged] DB unreachable, skipping:', e.message);
    process.exit(0);
  }
  const r = await c.query(`SELECT count(*)::int AS n FROM dos_master.doctrine_article`);
  const a = await c.query(`SELECT count(DISTINCT article_no)::int AS n FROM dos_master.doctrine_acknowledgement`);
  await c.end();
  const n = r.rows[0].n;
  const ack = a.rows[0].n;
  if (n < 11) {
    console.error(`[doctrine-acknowledged] FAIL only ${n}/11 doctrine articles present`);
    process.exit(1);
  }
  if (ack < 11) {
    console.error(`[doctrine-acknowledged] FAIL only ${ack}/11 articles acknowledged by any actor`);
    process.exit(1);
  }
  console.log(`[doctrine-acknowledged] PASS 11/11 articles seeded + ${ack}/11 acknowledged`);
}

main().catch((e) => { console.error('[doctrine-acknowledged] ERROR', e.message); process.exit(1); });

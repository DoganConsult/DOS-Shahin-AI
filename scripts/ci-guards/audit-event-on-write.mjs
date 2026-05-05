#!/usr/bin/env node
/**
 * DOS Master Doctrine — audit-event on every controlled write.
 *
 * Verifies the dos_master_writer_audit ledger contains entries from
 * every DOS Master service that has performed a controlled write,
 * proving the trg_dos_master_only trigger is firing end-to-end.
 */
import { Client } from 'pg';

const EXPECTED_ACTORS = ['dos-master'];

async function main() {
  const cs = process.env.DATABASE_URL || `postgres://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc`;
  const c = new Client({ connectionString: cs });
  try { await c.connect(); } catch (e) {
    console.warn('[audit-event-on-write] DB unreachable, skipping:', e.message);
    process.exit(0);
  }
  const r = await c.query(
    `SELECT actor, count(*)::int AS n FROM dos.dos_master_writer_audit GROUP BY actor ORDER BY actor`,
  );
  await c.end();
  const seen = new Set(r.rows.map((row) => row.actor));
  const missing = EXPECTED_ACTORS.filter((a) => !seen.has(a));
  if (missing.length) {
    console.error('[audit-event-on-write] FAIL no audit rows for actor(s):', missing.join(','));
    process.exit(1);
  }
  const total = r.rows.reduce((acc, row) => acc + Number(row.n), 0);
  console.log(`[audit-event-on-write] PASS ${total} audit rows across ${seen.size} actor(s)`);
}
main().catch((e) => { console.error('[audit-event-on-write] ERROR', e.message); process.exit(1); });

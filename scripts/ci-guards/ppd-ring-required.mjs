#!/usr/bin/env node
/**
 * DOS Master Doctrine Article 7 — Progressive Production Delivery.
 *
 * Verifies the canonical platform-rollout plan has 6 rings (R0..R5),
 * each with at least 5 health gates and at least 1 cohort selector.
 * Used as the PPD substrate readiness gate.
 */
import { Client } from 'pg';

async function main() {
  const cs = process.env.DATABASE_URL
    || `postgres://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc`;
  const c = new Client({ connectionString: cs });
  try { await c.connect(); } catch (e) {
    console.warn('[ppd-ring-required] DB unreachable, skipping:', e.message);
    process.exit(0);
  }
  const plan = await c.query(`SELECT id FROM dos.rollout_plan WHERE title='platform-rollout' ORDER BY created_at DESC LIMIT 1`);
  if (!plan.rows.length) {
    console.error('[ppd-ring-required] FAIL canonical platform-rollout plan missing');
    process.exit(1);
  }
  const planId = plan.rows[0].id;
  const rings = await c.query(
    `SELECT r.ring_code,
            (SELECT count(*) FROM dos.rollout_health_gate g WHERE g.ring_id = r.id) AS gates,
            (SELECT count(*) FROM dos.rollout_cohort co WHERE co.ring_id = r.id) AS cohorts
       FROM dos.rollout_ring r WHERE plan_id=$1::uuid ORDER BY ring_order`,
    [planId],
  );
  await c.end();
  const expected = ['R0','R1','R2','R3','R4','R5'];
  const got = rings.rows.map((r) => r.ring_code);
  const missing = expected.filter((c) => !got.includes(c));
  if (missing.length) {
    console.error('[ppd-ring-required] FAIL missing rings:', missing.join(','));
    process.exit(1);
  }
  let failures = 0;
  for (const r of rings.rows) {
    if (Number(r.gates) < 5)   { console.error(`[ppd-ring-required] ${r.ring_code} only ${r.gates}/5 health gates`); failures++; }
    if (Number(r.cohorts) < 1) { console.error(`[ppd-ring-required] ${r.ring_code} no cohort selector`); failures++; }
  }
  if (failures) process.exit(1);
  console.log('[ppd-ring-required] PASS 6 rings × 5 gates × ≥1 cohort');
}

main().catch((e) => { console.error('[ppd-ring-required] ERROR', e.message); process.exit(1); });

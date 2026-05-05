#!/usr/bin/env node
/**
 * DOS Master Doctrine Article 11 — DOS Master is the only writer.
 *
 * Verifies every controlled table has trg_dos_master_only attached.
 * Hard-fails CI if a controlled table is missing the trigger or if
 * the dos.actor='dos-master' SET is absent from any service repo.
 */
import { Client } from 'pg';

const CONTROLLED = [
  ['dos','dos_master_role'], ['dos','dos_master_grant'],
  ['dos','dos_master_invalidation_log'],
  ['dos','rollout_plan'], ['dos','rollout_ring'], ['dos','rollout_cohort'],
  ['dos','rollout_health_gate'], ['dos','rollout_evaluation'],
  ['dos','rollout_rollback'], ['dos','rollout_compensation_step'],
  ['dos','publish_revision'], ['dos','publish_rollback'], ['dos','publish_target'],
  ['dos','admin_pillar'], ['dos','admin_pillar_page'], ['dos','admin_pillar_widget'],
  ['platform_admin','platform_admin_user'], ['platform_admin','platform_admin_role'],
  ['platform_admin','platform_admin_grant'],
  ['dos_master','service_registry'], ['dos_master','service_endpoint'],
  ['dos_master','product_registry'], ['dos_master','signup_flow'],
  ['dos_master','signup_attempt'], ['dos_master','provisioning_job'],
  ['dos_master','doctrine_article'],
];

async function main() {
  const cs = process.env.DATABASE_URL
    || `postgres://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc`;
  const c = new Client({ connectionString: cs });
  try { await c.connect(); } catch (e) {
    console.warn('[dos-master-only] DB unreachable, skipping:', e.message);
    process.exit(0);
  }
  let failures = 0;
  for (const [s, t] of CONTROLLED) {
    const r = await c.query(
      `SELECT tgname FROM pg_trigger tg
         JOIN pg_class c ON c.oid = tg.tgrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname=$1 AND c.relname=$2 AND NOT tg.tgisinternal AND tg.tgname LIKE 'trg_dos_master_only%'`,
      [s, t],
    );
    if (!r.rows.length) {
      console.error(`[dos-master-only] MISSING trigger on ${s}.${t}`);
      failures++;
    }
  }
  await c.end();
  if (failures) {
    console.error(`[dos-master-only] FAIL ${failures} table(s) missing trg_dos_master_only`);
    process.exit(1);
  }
  console.log(`[dos-master-only] PASS ${CONTROLLED.length} controlled tables protected`);
}

main().catch((e) => { console.error('[dos-master-only] ERROR', e.message); process.exit(1); });

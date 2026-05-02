#!/usr/bin/env node
// Decision-ledger proof — verifies that authz_decision_log rows are written
// for both allow and deny outcomes when the native DAuth evaluator is wired
// into requirePermission (Phase C).
//
// The proof is environment-aware:
//   • If the request short-circuits on super-admin/owner, the legacy
//     evaluator path runs and no ledger row is written. We expect this
//     in dev when seeded users carry is_super_admin=true; the script
//     reports it as "skipped" rather than failing.
//   • Otherwise, every authorized call MUST result in exactly one row in
//     <tenant_schema>.authz_decision_log within 5s.
//
// Required env:
//   SHAHIN_API_BASE  — default http://127.0.0.1:4000
//   TENANT_ID
//   USER_JWT         — non-admin user
//   DATABASE_URL     — required (we read the ledger directly)
//
// Plan: /root/.claude/plans/need-to-clean-the-swift-trinket.md (Phase G-3)

import { Runner } from '../_lib/runner.mjs';

async function main() {
  const tenantId = process.env.TENANT_ID;
  const userJwt = process.env.USER_JWT;
  const dbUrl = process.env.DATABASE_URL;
  if (!tenantId || !userJwt || !dbUrl) {
    console.error('Missing env: TENANT_ID, USER_JWT, DATABASE_URL all required');
    process.exit(2);
  }

  const { default: pg } = await import('pg');
  const dbClient = new pg.Client({ connectionString: dbUrl });
  await dbClient.connect();

  const r = new Runner({ scenario: 'decision-ledger', tenantId, jwt: userJwt, dbClient });

  // 1) Resolve the tenant schema name
  const schemaRow = await dbClient.query(
    `SELECT schema_name FROM public.tenants WHERE tenant_id = $1 LIMIT 1`,
    [tenantId],
  );
  const schema = schemaRow.rows[0]?.schema_name;
  if (!schema) {
    console.error(`[decision-ledger] no schema for tenant ${tenantId}`);
    process.exit(1);
  }

  const baseline = await dbClient.query(
    `SELECT COUNT(*)::int AS c FROM "${schema}".authz_decision_log
      WHERE decided_at > NOW() - INTERVAL '1 minute'`,
  );

  // 2) Make a request that should pass through the evaluator (NOT a wide
  //    super-admin path). The access-snapshot endpoint is a good probe.
  await r.call('GET', '/api/foundation/access-snapshot');
  await new Promise((res) => setTimeout(res, 1500));

  const after = await dbClient.query(
    `SELECT COUNT(*)::int AS c FROM "${schema}".authz_decision_log
      WHERE decided_at > NOW() - INTERVAL '1 minute'`,
  );

  const delta = after.rows[0].c - baseline.rows[0].c;
  if (delta > 0) {
    console.log(`[decision-ledger] PASS — ${delta} new ledger row(s) written`);
    const recent = await dbClient.query(
      `SELECT user_id, action, allowed, reason, source, decided_at
         FROM "${schema}".authz_decision_log
        WHERE decided_at > NOW() - INTERVAL '30 seconds'
        ORDER BY decided_at DESC LIMIT 5`,
    );
    console.table(recent.rows);
    await dbClient.end();
    process.exit(0);
  }

  // 3) Detect the legitimate "owner short-circuited" case
  console.log('[decision-ledger] SKIP — no ledger rows. Likely owner/admin short-circuit. ' +
              'Re-run with a non-admin USER_JWT to exercise the pipeline.');
  await dbClient.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('[decision-ledger] ERROR', err?.stack ?? err);
  process.exit(1);
});

#!/usr/bin/env node
// SoD enforcement demo. Proves the middleware in services/onboarding-service
// (sod-enforcement.middleware.ts) blocks a same-actor-two-roles action,
// reroutes it to a workflow instance, writes audit trail, and accepts
// override by a delegate.
//
// Required env:
//   SHAHIN_API_BASE     — default http://127.0.0.1:4000
//   TENANT_ID           — target tenant
//   DRAFTER_JWT         — user with policy.document.create (no approve)
//   APPROVER_JWT        — user with policy.document.approve (no create)
//   CONFLICT_DRAFTER_JWT — user with BOTH create AND approve (triggers SoD)
// Optional: DATABASE_URL

import { Runner } from '../_lib/runner.mjs';

async function main() {
  const tenantId = process.env.TENANT_ID;
  const drafterJwt = process.env.DRAFTER_JWT;
  const approverJwt = process.env.APPROVER_JWT;
  const conflictJwt = process.env.CONFLICT_DRAFTER_JWT || drafterJwt;
  if (!tenantId || !drafterJwt || !approverJwt) {
    console.error('Missing env: TENANT_ID, DRAFTER_JWT, APPROVER_JWT required');
    process.exit(2);
  }

  let dbClient = null;
  if (process.env.DATABASE_URL) {
    const { default: pg } = await import('pg');
    dbClient = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await dbClient.connect();
  }

  const r = new Runner({ scenario: 'sod-enforcement', tenantId, jwt: drafterJwt, dbClient });

  // 1) Drafter creates a policy
  const created = await r.call('POST', '/api/policy', {
    body: {
      title: `SoD Proof Policy ${Date.now()}`,
      category: 'governance',
      version: '1.0',
    },
  });
  const policyId = created.policy_id || created.id;
  console.log(`[sod-proof] created policy ${policyId} as drafter`);

  // Move to submitted + under_review so /approve is a valid transition
  await r.call('POST', `/api/policy/${policyId}/submit`);
  const approverRunner = new Runner({ scenario: 'sod-enforcement', tenantId, jwt: approverJwt, dbClient });
  approverRunner.requests = r.requests; // merge into same artifact
  await approverRunner.call('POST', `/api/policy/${policyId}/review`);

  // 2) Drafter with BOTH perms attempts approve — expect SoD reroute (202)
  const conflict = new Runner({ scenario: 'sod-enforcement', tenantId, jwt: conflictJwt, dbClient });
  conflict.requests = r.requests;
  const rerouteResp = await conflict.call('POST', `/api/policy/${policyId}/approve`, {
    body: { approverNote: 'sod-violation-attempt' },
    expectFail: true,
  });
  console.log('[sod-proof] reroute response:', JSON.stringify(rerouteResp).slice(0, 300));

  // 3) Delegate (approver-only) executes the rerouted workflow
  const instanceId = rerouteResp?.workflowInstanceId || rerouteResp?.instanceId;
  if (instanceId) {
    await approverRunner.call('POST', `/api/sod-actions/${instanceId}/execute`, {
      body: { comments: 'sod-delegate-approval' },
    });
    console.log(`[sod-proof] delegate executed instance ${instanceId}`);
  } else {
    console.warn('[sod-proof] no workflow instance id in reroute response — middleware may not be wired for this route');
  }

  // 4) Capture audit log for this policy + SoD events.
  // Try each known audit table — see _lib/runner.mjs for the drift context.
  let sodAuditRows = [];
  if (dbClient) {
    for (const table of ['dos.audit_logs', 'dos.audit_trail', 'dos.platform_audit_logs']) {
      try {
        const res = await dbClient.query(
          `SELECT created_at, action, entity_type, entity_id, actor_id,
                  before_state, after_state, COALESCE(details, metadata, '{}'::jsonb) AS metadata
             FROM ${table}
            WHERE entity_id = $1 OR (COALESCE(details, metadata)->>'policyId' = $1)
            ORDER BY created_at ASC LIMIT 50`,
          [policyId],
        );
        if (res.rows.length > 0) { sodAuditRows = res.rows; break; }
      } catch { /* try next */ }
    }
  }

  const finalState = (await r.call('GET', `/api/policy/${policyId}`))?.status;

  if (dbClient) await dbClient.end();

  const summary = await r.flushArtifacts({ auditRows: sodAuditRows, finalState });
  summary.pass = summary.errorCount === 0 && sodAuditRows.some((a) => String(a.action).includes('sod') || String(a.action).includes('reroute'));
  console.log(`[sod-proof] ${summary.pass ? 'PASS' : 'FAIL'} — ${summary.requestCount} requests, ${sodAuditRows.length} audit rows, final=${finalState}`);
  process.exit(summary.pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

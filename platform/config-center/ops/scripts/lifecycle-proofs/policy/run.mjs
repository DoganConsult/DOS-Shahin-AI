#!/usr/bin/env node
// Policy lifecycle proof: draft → submitted → under_review → approved → published → active
//
// Required env:
//   SHAHIN_API_BASE     — default http://127.0.0.1:4000
//   TENANT_ID           — the target tenant schema id
//   DRAFTER_JWT         — bearer token for the user who creates+submits
//   APPROVER_JWT        — bearer token for the user with policy.document.approve
//   DATABASE_URL        — (optional) postgres url for audit-trail capture
//
// Output: requests.jsonl, audit_trail.csv, summary.json

import { Runner } from '../_lib/runner.mjs';

async function main() {
  const tenantId = process.env.TENANT_ID;
  const drafterJwt = process.env.DRAFTER_JWT;
  const approverJwt = process.env.APPROVER_JWT;
  if (!tenantId || !drafterJwt) {
    console.error('Missing env: TENANT_ID, DRAFTER_JWT required; APPROVER_JWT recommended');
    process.exit(2);
  }

  let dbClient = null;
  if (process.env.DATABASE_URL) {
    const { default: pg } = await import('pg');
    dbClient = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await dbClient.connect();
  }

  const drafter = new Runner({ scenario: 'policy', tenantId, jwt: drafterJwt, dbClient });

  // 1) Create
  const created = await drafter.call('POST', '/api/policy', {
    body: {
      title: `Lifecycle Proof Policy ${Date.now()}`,
      category: 'governance',
      description: 'Automated lifecycle proof',
      version: '1.0',
    },
  });
  const policyId = created.policy_id || created.id;
  console.log(`[policy-proof] created policy ${policyId}`);

  // 2) Submit (drafter)
  await drafter.call('POST', `/api/policy/${policyId}/submit`);

  // 3) Move to under_review (approver if available, else drafter)
  const approver = approverJwt
    ? new Runner({ scenario: 'policy', tenantId, jwt: approverJwt, dbClient })
    : drafter;
  // Merge approver's future requests into drafter's log for single-file trail
  const originalCall = approver.call.bind(approver);
  approver.call = async (...args) => {
    const r = await originalCall(...args);
    drafter.requests.push(...approver.requests.slice(drafter.requests.length));
    return r;
  };

  await approver.call('POST', `/api/policy/${policyId}/review`);

  // 4) Approve
  await approver.call('POST', `/api/policy/${policyId}/approve`, {
    body: { approverNote: 'proof-run-approved' },
  });

  // 5) Publish
  await approver.call('POST', `/api/policy/${policyId}/publish`, {
    body: { effectiveDate: new Date().toISOString() },
  });

  // 6) Activate
  await approver.call('POST', `/api/policy/${policyId}/activate`);

  // Capture audit trail
  const auditRows = await drafter.queryAuditTrail({ entityId: policyId, entityType: 'policy' });

  const finalState = (await drafter.call('GET', `/api/policy/${policyId}`))?.status;

  if (dbClient) await dbClient.end();

  const summary = await drafter.flushArtifacts({ auditRows, finalState });
  console.log(`[policy-proof] ${summary.pass ? 'PASS' : 'FAIL'} — ${summary.requestCount} requests, ${summary.auditRowCount} audit rows, final=${finalState}`);
  process.exit(summary.pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

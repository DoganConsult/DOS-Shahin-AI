#!/usr/bin/env node
// Risk lifecycle proof: draft → submitted → under_review → assessed →
//   treatment_planned → approved → active → mitigating → accepted → closed
//
// Required env: SHAHIN_API_BASE, TENANT_ID, OWNER_JWT, APPROVER_JWT
// Optional: DATABASE_URL

import { Runner } from '../_lib/runner.mjs';

async function main() {
  const tenantId = process.env.TENANT_ID;
  const ownerJwt = process.env.OWNER_JWT;
  const approverJwt = process.env.APPROVER_JWT || ownerJwt;
  if (!tenantId || !ownerJwt) {
    console.error('Missing env: TENANT_ID, OWNER_JWT required');
    process.exit(2);
  }

  let dbClient = null;
  if (process.env.DATABASE_URL) {
    const { default: pg } = await import('pg');
    dbClient = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await dbClient.connect();
  }

  const owner = new Runner({ scenario: 'risk', tenantId, jwt: ownerJwt, dbClient });

  const created = await owner.call('POST', '/api/risk', {
    body: {
      title: `Lifecycle Proof Risk ${Date.now()}`,
      category: 'operational',
      likelihood: 'medium',
      impact: 'high',
      description: 'Automated lifecycle proof',
    },
  });
  const riskId = created.risk_id || created.id;
  console.log(`[risk-proof] created risk ${riskId}`);

  await owner.call('POST', `/api/risk/${riskId}/submit`);
  await owner.call('POST', `/api/risk/${riskId}/review`);
  await owner.call('POST', `/api/risk/${riskId}/assess`, { body: { score: 18 } });
  await owner.call('POST', `/api/risk/${riskId}/plan-treatment`, {
    body: { treatmentType: 'mitigate', plan: 'Implement control X and monitor KRI Y' },
  });

  const approver = approverJwt !== ownerJwt
    ? new Runner({ scenario: 'risk', tenantId, jwt: approverJwt, dbClient })
    : owner;
  await approver.call('POST', `/api/risk/${riskId}/approve-treatment`, {
    body: { note: 'proof-run-approved' },
  });
  if (approver !== owner) owner.requests.push(...approver.requests);

  await owner.call('POST', `/api/risk/${riskId}/activate`);
  await owner.call('POST', `/api/risk/${riskId}/start-mitigation`);
  await owner.call('POST', `/api/risk/${riskId}/accept`, {
    body: { signoffActorId: approverJwt === ownerJwt ? 'self' : 'approver', rationale: 'residual-within-appetite' },
  });
  await owner.call('POST', `/api/risk/${riskId}/close`, { body: { reason: 'proof-run-completed' } });

  const auditRows = await owner.queryAuditTrail({ entityId: riskId, entityType: 'risk' });
  const finalState = (await owner.call('GET', `/api/risk/${riskId}`))?.status;

  if (dbClient) await dbClient.end();

  const summary = await owner.flushArtifacts({ auditRows, finalState });
  console.log(`[risk-proof] ${summary.pass ? 'PASS' : 'FAIL'} — ${summary.requestCount} requests, ${summary.auditRowCount} audit rows, final=${finalState}`);
  process.exit(summary.pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
// Vendor lifecycle proof: identified → questionnaire_sent → questionnaire_received
//   → assessing → assessed → approved → onboarded → active
//
// Required env: SHAHIN_API_BASE, TENANT_ID, REGISTRAR_JWT, APPROVER_JWT
// Optional: DATABASE_URL for audit capture

import { Runner } from '../_lib/runner.mjs';

async function main() {
  const tenantId = process.env.TENANT_ID;
  const registrarJwt = process.env.REGISTRAR_JWT;
  const approverJwt = process.env.APPROVER_JWT || registrarJwt;
  if (!tenantId || !registrarJwt) {
    console.error('Missing env: TENANT_ID, REGISTRAR_JWT required');
    process.exit(2);
  }

  let dbClient = null;
  if (process.env.DATABASE_URL) {
    const { default: pg } = await import('pg');
    dbClient = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await dbClient.connect();
  }

  const r = new Runner({ scenario: 'vendor', tenantId, jwt: registrarJwt, dbClient });

  const created = await r.call('POST', '/api/vendor', {
    body: {
      name: `Lifecycle Proof Vendor ${Date.now()}`,
      category: 'technology',
      risk_tier: 'medium',
      status: 'identified',
    },
  });
  const vendorId = created.vendor_id || created.id;
  console.log(`[vendor-proof] created vendor ${vendorId}`);

  await r.call('POST', `/api/vendor/${vendorId}/send-questionnaire`);
  await r.call('POST', `/api/vendor/${vendorId}/receive-questionnaire`, {
    body: { responses: { sec01: 'yes', sec02: 'yes' } },
  });
  await r.call('POST', `/api/vendor/${vendorId}/start-assessment`);
  await r.call('POST', `/api/vendor/${vendorId}/complete-assessment`, { body: { score: 82 } });

  const approver = approverJwt !== registrarJwt
    ? new Runner({ scenario: 'vendor', tenantId, jwt: approverJwt, dbClient })
    : r;
  await approver.call('POST', `/api/vendor/${vendorId}/approve`, {
    body: { note: 'proof-run-approved' },
  });
  if (approver !== r) r.requests.push(...approver.requests);

  await r.call('POST', `/api/vendor/${vendorId}/onboard`);
  await r.call('POST', `/api/vendor/${vendorId}/activate`);

  const auditRows = await r.queryAuditTrail({ entityId: vendorId, entityType: 'vendor' });
  const finalState = (await r.call('GET', `/api/vendor/${vendorId}`))?.status;

  if (dbClient) await dbClient.end();

  const summary = await r.flushArtifacts({ auditRows, finalState });
  console.log(`[vendor-proof] ${summary.pass ? 'PASS' : 'FAIL'} — ${summary.requestCount} requests, ${summary.auditRowCount} audit rows, final=${finalState}`);
  process.exit(summary.pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
// Access-snapshot proof — verifies the new /api/foundation/access-snapshot
// endpoint composes Foundation hierarchy data with DAuth identity data and
// returns the unified shape the FE consumes.
//
// Required env:
//   SHAHIN_API_BASE  — default http://127.0.0.1:4000
//   TENANT_ID        — target tenant
//   USER_JWT         — JWT for the user whose snapshot to fetch
// Optional:
//   DATABASE_URL     — to attach decision-ledger trace
//
// Plan: docs/plans/need-to-clean-the-swift-trinket.md (Phase G-3)

import { Runner } from '../_lib/runner.mjs';

async function main() {
  const tenantId = process.env.TENANT_ID;
  const userJwt = process.env.USER_JWT;
  if (!tenantId || !userJwt) {
    console.error('Missing env: TENANT_ID, USER_JWT required');
    process.exit(2);
  }

  let dbClient = null;
  if (process.env.DATABASE_URL) {
    const { default: pg } = await import('pg');
    dbClient = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await dbClient.connect();
  }

  const r = new Runner({ scenario: 'access-snapshot', tenantId, jwt: userJwt, dbClient });

  // 1) Fetch the snapshot
  const resp = await r.call('GET', '/api/foundation/access-snapshot');
  const snap = resp?.data ?? resp;
  if (!snap) {
    console.error('[access-snapshot] empty response');
    process.exit(1);
  }

  // 2) Verify required shape
  const required = [
    'actor', 'currentPosition', 'currentRoleProfile',
    'orgScope', 'managerChain',
    'pendingApprovals', 'deniedActions', 'inheritedPolicies',
    'audit',
  ];
  const missing = required.filter((k) => !(k in snap));
  if (missing.length) {
    console.error(`[access-snapshot] FAIL — missing keys: ${missing.join(', ')}`);
    process.exit(1);
  }

  // 3) Verify orgScope sub-shape
  if (!Array.isArray(snap.orgScope?.businessUnits) || !Array.isArray(snap.orgScope?.organizations)) {
    console.error('[access-snapshot] FAIL — orgScope.businessUnits / .organizations missing');
    process.exit(1);
  }

  // 4) Audit trace metadata
  if (!snap.audit?.snapshotGeneratedAt || !snap.audit?.correlationId) {
    console.error('[access-snapshot] FAIL — audit.snapshotGeneratedAt / .correlationId missing');
    process.exit(1);
  }

  console.log('[access-snapshot] PASS');
  console.log(JSON.stringify({
    correlationId: snap.audit.correlationId,
    currentPosition: snap.currentPosition?.title_en ?? null,
    currentRoleProfile: snap.currentRoleProfile,
    businessUnits: snap.orgScope.businessUnits.length,
    organizations: snap.orgScope.organizations.length,
    managerChainDepth: snap.managerChain.length,
    pendingApprovals: snap.pendingApprovals.length,
    deniedActions: snap.deniedActions.length,
  }, null, 2));

  if (dbClient) await dbClient.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('[access-snapshot] ERROR', err?.stack ?? err);
  process.exit(1);
});

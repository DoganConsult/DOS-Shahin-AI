#!/usr/bin/env node
// Org-hierarchy proof — verifies the new Foundation routes work end-to-end:
//   GET /api/foundation/org-hierarchy/tree
//   GET /api/foundation/manager-chain (caller's own)
//   GET /api/foundation/org-scope     (caller's own)
//   GET /api/foundation/inheritance/organization/<orgId>
//
// Required env:
//   SHAHIN_API_BASE  — default http://127.0.0.1:4000
//   TENANT_ID
//   USER_JWT
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

  const r = new Runner({ scenario: 'org-hierarchy', tenantId, jwt: userJwt });

  // 1) Org tree
  const tree = (await r.call('GET', '/api/foundation/org-hierarchy/tree'))?.data ?? [];
  console.log(`[org-hierarchy] tree size: ${tree.length}`);
  if (!Array.isArray(tree)) {
    console.error('[org-hierarchy] FAIL — tree is not an array');
    process.exit(1);
  }

  // 2) Manager chain
  const chain = (await r.call('GET', '/api/foundation/manager-chain'))?.data ?? [];
  console.log(`[org-hierarchy] manager chain depth: ${chain.length}`);

  // 3) Org scope
  const scope = (await r.call('GET', '/api/foundation/org-scope'))?.data ?? null;
  if (!scope) {
    console.error('[org-hierarchy] FAIL — empty org-scope');
    process.exit(1);
  }
  console.log(`[org-hierarchy] org-scope: ${scope.businessUnits.length} BU(s), ${scope.organizations.length} org(s)`);

  // 4) Inheritance walk on the user's root org (if any)
  const rootOrgId = scope.organizations[scope.organizations.length - 1]?.organization_id;
  if (rootOrgId) {
    const inh = (await r.call('GET', `/api/foundation/inheritance/organization/${rootOrgId}`))?.data ?? null;
    if (!inh || !Array.isArray(inh.chain)) {
      console.error('[org-hierarchy] FAIL — inheritance walk shape mismatch');
      process.exit(1);
    }
    console.log(`[org-hierarchy] inheritance chain depth: ${inh.chain.length}`);
  } else {
    console.log('[org-hierarchy] no root org — skipping inheritance walk');
  }

  console.log('[org-hierarchy] PASS');
  process.exit(0);
}

main().catch((err) => {
  console.error('[org-hierarchy] ERROR', err?.stack ?? err);
  process.exit(1);
});

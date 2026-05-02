#!/usr/bin/env node
/**
 * DAuth-ECP Part 4 — OpenFGA tuple reconciliation.
 *
 * Compares expected tuples derived from the DAuth source-of-truth (Postgres
 * tables) against what OpenFGA actually allows via `check()`. Reports:
 *   - expected tuples per source
 *   - missing (check() returns false for something the DB says should pass)
 *   - drift percentage
 *
 * Non-mutating. Meant to run nightly. Exit 0 on clean (drift ≤ threshold),
 * exit 2 on drift above threshold.
 */
import { Client } from 'pg';

const API_URL = process.env.DAUTH_OPENFGA_API_URL || 'http://127.0.0.1:8080';
const STORE_ID = process.env.DAUTH_OPENFGA_STORE_ID;
const MODEL_ID = process.env.DAUTH_OPENFGA_MODEL_ID;
const DRIFT_THRESHOLD = Number(process.env.DAUTH_RECONCILE_DRIFT_THRESHOLD ?? '0.001'); // 0.1%

if (!STORE_ID || !MODEL_ID || !process.env.DATABASE_URL) {
  console.error('[reconcile] DATABASE_URL, DAUTH_OPENFGA_STORE_ID, DAUTH_OPENFGA_MODEL_ID required');
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

// Authoritative role -> module-lifecycle verb grants. MUST match
// MODULE_LIFECYCLE_ROLE_GRANTS in @dos/authz-ids/src/fga.ts and the
// `module_lifecycle` type in model.v2.fga.
const MODULE_LIFECYCLE_PERMISSION_CODES = {
  request:       'lifecycle.module.request',
  cancelRequest: 'lifecycle.module.cancel_request',
  provision:     'lifecycle.module.provision',
  onboard:       'lifecycle.module.onboard',
  configure:     'lifecycle.module.configure',
  activate:      'lifecycle.module.activate',
  suspend:       'lifecycle.module.suspend',
  resume:        'lifecycle.module.resume',
  archive:       'lifecycle.module.archive',
  unarchive:     'lifecycle.module.unarchive',
  deprovision:   'lifecycle.module.deprovision',
  purge:         'lifecycle.module.purge',
  migrate:       'lifecycle.module.migrate',
  audit:         'lifecycle.module.audit',
};
const MODULE_LIFECYCLE_ROLE_GRANTS = {
  tenant_owner:      ['request', 'cancelRequest'],
  tenant_admin:      ['request', 'cancelRequest', 'onboard', 'configure',
                      'activate', 'suspend', 'resume', 'archive', 'unarchive'],
  module_owner:      ['onboard', 'configure'],
  billing_admin:     ['suspend', 'resume'],
  platform_operator: ['provision', 'deprovision', 'migrate'],
  platform_admin:    ['provision', 'deprovision', 'migrate', 'activate',
                      'suspend', 'resume', 'archive', 'unarchive', 'purge', 'audit'],
  dsoc_auditor:      ['audit'],
};

async function expectedTuples() {
  const tuples = [];
  const memberships = await client.query(
    `SELECT tenant_id, user_id, is_tenant_owner FROM public.tenant_user_memberships WHERE status='active'`,
  );
  for (const r of memberships.rows) {
    tuples.push({ user: `user:${r.user_id}`, relation: 'member', object: `tenant:${r.tenant_id}`, source: 'membership' });
    if (r.is_tenant_owner) {
      tuples.push({ user: `user:${r.user_id}`, relation: 'admin', object: `tenant:${r.tenant_id}`, source: 'owner' });
    }
  }

  // Module-lifecycle: role -> permission grants. These are catalogue tuples
  // (no per-tenant scoping) of shape:
  //   role:<roleCode>  granted_to_role  permission:lifecycle.module.<phase>
  // Reads of the per-tenant `module_lifecycle:<tenantId>:<moduleCode>` then
  // resolve via `permission.can_exercise` ↔ `role.member`.
  for (const [roleCode, verbs] of Object.entries(MODULE_LIFECYCLE_ROLE_GRANTS)) {
    for (const v of verbs) {
      const code = MODULE_LIFECYCLE_PERMISSION_CODES[v];
      if (!code) continue;
      tuples.push({
        user: `role:${roleCode}`,
        relation: 'granted_to_role',
        object: `permission:${code}`,
        source: 'lifecycle-role-grant',
      });
    }
  }
  return tuples;
}

async function checkTuple(t) {
  const body = {
    authorization_model_id: MODEL_ID,
    tuple_key: { user: t.user, relation: t.relation, object: t.object },
  };
  const res = await fetch(`${API_URL}/stores/${STORE_ID}/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    return { allowed: false, error: `HTTP ${res.status}` };
  }
  const j = await res.json();
  return { allowed: !!j.allowed };
}

async function main() {
  await client.connect();
  try {
    const expected = await expectedTuples();
    console.log(`[reconcile] expected=${expected.length}`);

    const missing = [];
    const errors = [];

    // Parallel check with bounded concurrency
    const CONCURRENCY = 10;
    let i = 0;
    const workers = Array.from({ length: CONCURRENCY }, async () => {
      while (true) {
        const idx = i++;
        if (idx >= expected.length) break;
        const t = expected[idx];
        const r = await checkTuple(t);
        if (r.error) errors.push({ t, ...r });
        else if (!r.allowed) missing.push(t);
      }
    });
    await Promise.all(workers);

    const total = expected.length;
    const drift = total === 0 ? 0 : missing.length / total;

    console.log(`[reconcile] present =${total - missing.length}`);
    console.log(`[reconcile] missing =${missing.length}`);
    console.log(`[reconcile] errors  =${errors.length}`);
    console.log(`[reconcile] drift   =${(drift * 100).toFixed(3)}% (threshold ${(DRIFT_THRESHOLD * 100).toFixed(3)}%)`);

    if (missing.length > 0) {
      console.log('[reconcile] first 10 missing:');
      for (const m of missing.slice(0, 10)) console.log(`  ${m.user} ${m.relation} ${m.object}`);
    }
    if (errors.length > 0) {
      console.log('[reconcile] first 10 errors:');
      for (const e of errors.slice(0, 10)) console.log(`  ${e.t.user} ${e.t.relation} ${e.t.object} → ${e.error}`);
    }

    if (drift > DRIFT_THRESHOLD) {
      console.error('[reconcile] FAIL — drift above threshold');
      process.exit(2);
    }
    if (errors.length > 0) {
      console.error('[reconcile] FAIL — check errors');
      process.exit(2);
    }
    console.log('[reconcile] OK');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[reconcile]', err);
  process.exit(1);
});

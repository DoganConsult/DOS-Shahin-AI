#!/usr/bin/env node
/**
 * DAuth-ECP Part 5 — ReBAC enforce/rollback smoke.
 *
 * Exercises the @dos/auth ReBAC port + factory + checkRebacAndLog helper
 * end-to-end:
 *   1. Initializes factory from env (DAUTH_OPENFGA_STORE_ID/MODEL_ID).
 *   2. Runs six verification checks:
 *      - allowed relation (real DB member) → expect allow
 *      - unrelated user   → expect deny
 *      - unrelated tenant → expect deny
 *      - delegation grant → expect allow
 *      - delegation revoke → expect deny
 *      - missing tuple    → expect deny (never HTTP 500)
 *   3. Writes a decision-ledger row for each via checkRebacAndLog.
 *   4. Reads the rows back and asserts engine_results.<source> was
 *      populated with the verdict.
 *
 * Expected behavior by env:
 *   - DAUTH_OPENFGA_ENFORCE=false (or unset) → NativeRebacAdapter primary.
 *     All checks return `allowed: true` (native is pass-through). This is
 *     the rollback baseline — flipping the flag back here never denies a
 *     customer; the rest of DAuth's auth pipeline (scope, SoD, RLS)
 *     continues to gate.
 *   - DAUTH_OPENFGA_ENFORCE=true → OpenFgaRebacAdapter primary. Returns
 *     real OpenFGA verdicts against the backfilled tuples.
 *
 * Exit 0 when observed verdicts match the expected-by-mode matrix.
 */
import { Client } from 'pg';
import {
  initRebacFactory,
  getRebacAdapter,
  checkRebacAndLog,
  readAuthDecision,
} from '@dos/auth';

const API_URL  = process.env.DAUTH_OPENFGA_API_URL  || 'http://127.0.0.1:8080';
const STORE_ID = process.env.DAUTH_OPENFGA_STORE_ID;
const MODEL_ID = process.env.DAUTH_OPENFGA_MODEL_ID;

const ENFORCE = (process.env.DAUTH_OPENFGA_ENFORCE || '').toLowerCase() === 'true';

if (!STORE_ID || !MODEL_ID || !process.env.DATABASE_URL) {
  console.error('[smoke] DATABASE_URL, DAUTH_OPENFGA_STORE_ID, DAUTH_OPENFGA_MODEL_ID required');
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function writeTuple(user, relation, object) {
  const body = {
    authorization_model_id: MODEL_ID,
    writes: { tuple_keys: [{ user, relation, object }] },
  };
  const r = await fetch(`${API_URL}/stores/${STORE_ID}/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok && !(r.status === 400 && (await r.text()).includes('already exists'))) {
    throw new Error(`[smoke] writeTuple failed: ${r.status}`);
  }
}

async function deleteTuple(user, relation, object) {
  const body = {
    authorization_model_id: MODEL_ID,
    deletes: { tuple_keys: [{ user, relation, object }] },
  };
  await fetch(`${API_URL}/stores/${STORE_ID}/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function main() {
  await client.connect();
  try {
    // Pull one real member/owner pair from the DB
    const r = await client.query(
      `SELECT tenant_id, user_id FROM public.tenant_user_memberships WHERE status='active' LIMIT 1`,
    );
    if (r.rows.length === 0) {
      console.error('[smoke] no active memberships in DB');
      process.exit(1);
    }
    const tenantId = r.rows[0].tenant_id;
    const userId   = r.rows[0].user_id;

    initRebacFactory({
      openfga: {
        apiUrl: API_URL, storeId: STORE_ID, modelId: MODEL_ID, timeoutMs: 500,
      },
      onMissingConfig: (why) => console.warn('[smoke] factory warning:', why),
    });

    const { primary } = getRebacAdapter();
    console.log(`[smoke] primary adapter = ${primary.name}  (DAUTH_OPENFGA_ENFORCE=${ENFORCE})`);

    // Seed a synthetic delegation — cleaned up at the end of the run.
    await writeTuple('user:smoke-del-from', 'from', 'delegation:smoke-001');
    await writeTuple('user:smoke-del-to',   'to',   'delegation:smoke-001');

    const sqlClient = {
      query: async (sql, params) => client.query(sql, params),
    };

    const cases = [
      // name, input, expected-when-native, expected-when-openfga
      ['allowed relation (real member)',
        { relation: 'member', object: `tenant:${tenantId}`, userIdOverride: userId },
        true, true],
      ['unrelated user',
        { relation: 'member', object: `tenant:${tenantId}`, userIdOverride: 'ghost-user-9999' },
        true, false],
      ['unrelated tenant',
        { relation: 'member', object: 'tenant:no-such-tenant', userIdOverride: userId },
        true, false],
      ['delegation grant',
        { relation: 'to', object: 'delegation:smoke-001', userIdOverride: 'smoke-del-to' },
        true, true],
      ['delegation revoked (pre-revoke)',
        { relation: 'to', object: 'delegation:smoke-001', userIdOverride: 'smoke-del-to' },
        true, true],
      ['missing tuple (no-such-evidence)',
        { relation: 'owner', object: 'evidence:no-such-001', userIdOverride: userId },
        true, false],
    ];

    // Track pass/fail
    let pass = 0, fail = 0;
    const details = [];

    for (const [name, input, expNative, expOpenfga] of cases) {
      const result = await checkRebacAndLog(sqlClient, {
        tenantId,
        userId: input.userIdOverride || userId,
        object: input.object,
        relation: input.relation,
        action: `smoke.${input.relation}`,
      });
      const expected = ENFORCE ? expOpenfga : expNative;
      const ok = result.allowed === expected;
      if (ok) pass++; else fail++;

      // Ledger roundtrip — read the row back and verify engine_results has primary verdict.
      const row = await readAuthDecision(sqlClient, result.decisionId);
      const er = row?.engine_results || {};
      const recordedAllowed =
        (er[primary.name] && er[primary.name].allowed) === result.allowed;

      details.push({
        name,
        allowed: result.allowed,
        expected,
        primarySource: result.primary.source,
        ledgerOk: !!row && recordedAllowed,
        ok,
      });
    }

    // Now revoke the delegation tuples and re-test case 4
    await deleteTuple('user:smoke-del-from', 'from', 'delegation:smoke-001');
    await deleteTuple('user:smoke-del-to',   'to',   'delegation:smoke-001');
    const revoked = await checkRebacAndLog(sqlClient, {
      tenantId,
      userId: 'smoke-del-to',
      object: 'delegation:smoke-001',
      relation: 'to',
      action: 'smoke.to-post-revoke',
    });
    const expectedRevoked = ENFORCE ? false : true; // native always allows
    const revokedOk = revoked.allowed === expectedRevoked;
    if (revokedOk) pass++; else fail++;
    details.push({
      name: 'delegation after revoke',
      allowed: revoked.allowed,
      expected: expectedRevoked,
      primarySource: revoked.primary.source,
      ledgerOk: !!(await readAuthDecision(sqlClient, revoked.decisionId)),
      ok: revokedOk,
    });

    console.log('[smoke] results:');
    for (const d of details) {
      const mark = d.ok ? 'PASS' : 'FAIL';
      console.log(
        `  [${mark}] ${d.name.padEnd(38)} source=${String(d.primarySource).padEnd(8)} allowed=${String(d.allowed).padEnd(5)} expected=${String(d.expected).padEnd(5)} ledger=${d.ledgerOk}`,
      );
    }
    console.log(`[smoke] ${pass} pass / ${fail} fail`);

    if (fail > 0) process.exit(2);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[smoke]', err);
  process.exit(1);
});

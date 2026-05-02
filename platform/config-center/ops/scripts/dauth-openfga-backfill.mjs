#!/usr/bin/env node
/**
 * DAuth-ECP Part 4 — OpenFGA tuple backfill.
 *
 * Reads DAuth source-of-truth tables and writes equivalent OpenFGA tuples
 * against the DAuth authorization model (not the existing product model).
 *
 * Supports --dry-run (prints planned writes, touches nothing) and apply
 * mode (default).
 *
 * Reads env:
 *   DATABASE_URL                — Postgres URL with permissions to SELECT
 *                                  source-of-truth tables
 *   DAUTH_OPENFGA_API_URL       — default http://127.0.0.1:8080
 *   DAUTH_OPENFGA_STORE_ID      — required
 *   DAUTH_OPENFGA_MODEL_ID      — required
 *
 * Usage:
 *   node ops/scripts/dauth-openfga-backfill.mjs --dry-run
 *   node ops/scripts/dauth-openfga-backfill.mjs
 *
 * The script is idempotent: writing a tuple that already exists is a no-op
 * at the OpenFGA level. Deletes are NOT performed — this script only
 * establishes presence; reconciliation (separate script) handles drift.
 */
import { Client } from 'pg';

const API_URL = process.env.DAUTH_OPENFGA_API_URL || 'http://127.0.0.1:8080';
const STORE_ID = process.env.DAUTH_OPENFGA_STORE_ID;
const MODEL_ID = process.env.DAUTH_OPENFGA_MODEL_ID;
const DRY_RUN = process.argv.includes('--dry-run');

if (!STORE_ID || !MODEL_ID || !process.env.DATABASE_URL) {
  console.error('[backfill] DATABASE_URL, DAUTH_OPENFGA_STORE_ID, DAUTH_OPENFGA_MODEL_ID are required');
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function collectTuples() {
  const tuples = [];

  // tenant memberships → tenant:<id>#member@user:<uid>
  // + tenant:<id>#admin@user:<uid> when is_tenant_owner=true
  const memberships = await client.query(
    `SELECT tenant_id, user_id, is_tenant_owner
       FROM public.tenant_user_memberships
      WHERE status = 'active'`
  );
  for (const row of memberships.rows) {
    tuples.push({
      user: `user:${row.user_id}`,
      relation: 'member',
      object: `tenant:${row.tenant_id}`,
      source: 'public.tenant_user_memberships',
    });
    if (row.is_tenant_owner) {
      tuples.push({
        user: `user:${row.user_id}`,
        relation: 'admin',
        object: `tenant:${row.tenant_id}`,
        source: 'public.tenant_user_memberships(is_tenant_owner)',
      });
    }
  }

  // Optional source-of-truth tables. Query only if they exist AND have
  // expected columns — these are empty in staging today so this is a
  // forward-compatible scaffold.
  const optional = [
    {
      // dos.teams primary key is `team_id` (not `id`); emit tenant link
      // for every team that exists so the team#tenant relation is populated.
      table: 'dos.teams',
      cols: ['team_id', 'tenant_id'],
      where: `deleted_at IS NULL`,
      map: (r) => [{
        user: `tenant:${r.tenant_id}`,
        relation: 'tenant',
        object: `team:${r.team_id}`,
        source: 'dos.teams',
      }],
    },
    {
      table: 'dos.team_members',
      cols: ['team_id', 'user_id'],
      map: (r) => [{
        user: `user:${r.user_id}`,
        relation: 'member',
        object: `team:${r.team_id}`,
        source: 'dos.team_members',
      }],
    },
    {
      // dos.departments primary key is `department_id`; emit tenant link.
      table: 'dos.departments',
      cols: ['department_id', 'tenant_id'],
      where: `deleted_at IS NULL`,
      map: (r) => [{
        user: `tenant:${r.tenant_id}`,
        relation: 'tenant',
        object: `department:${r.department_id}`,
        source: 'dos.departments',
      }],
    },
    {
      // dos.delegations is a view; key column is delegation_id, with
      // separate from_user_id / to_user_id, and validity is time-bounded
      // (not status). Treat as active when valid_until is NULL or future.
      table: 'dos.delegations',
      cols: ['delegation_id', 'from_user_id', 'to_user_id'],
      where: `deleted_at IS NULL AND (valid_until IS NULL OR valid_until > NOW())`,
      map: (r) => [
        { user: `user:${r.from_user_id}`, relation: 'from',              object: `delegation:${r.delegation_id}`, source: 'dos.delegations.from' },
        { user: `user:${r.to_user_id}`,   relation: 'to',                object: `delegation:${r.delegation_id}`, source: 'dos.delegations.to'   },
        { user: `user:${r.to_user_id}`,   relation: 'acts_on_behalf_of', object: `user:${r.from_user_id}`,        source: 'dos.delegations.acts_on_behalf_of' },
      ],
    },
  ];

  for (const spec of optional) {
    const exists = await client.query(
      `SELECT EXISTS(
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = split_part($1, '.', 1)
           AND table_name   = split_part($1, '.', 2)
       ) AS ok`,
      [spec.table],
    );
    if (!exists.rows[0].ok) continue;
    const sql = `SELECT ${spec.cols.join(', ')} FROM ${spec.table}${spec.where ? ' WHERE ' + spec.where : ''}`;
    const rs = await client.query(sql);
    for (const row of rs.rows) {
      tuples.push(...spec.map(row));
    }
  }

  return tuples;
}

async function writeTuplesBatched(tuples) {
  if (tuples.length === 0) return { written: 0, errors: [] };

  const batches = [];
  const BATCH = 40; // OpenFGA write limit is ~100; stay well under
  for (let i = 0; i < tuples.length; i += BATCH) {
    batches.push(tuples.slice(i, i + BATCH));
  }

  let written = 0;
  const errors = [];

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const body = {
      authorization_model_id: MODEL_ID,
      writes: {
        tuple_keys: batch.map((t) => ({ user: t.user, relation: t.relation, object: t.object })),
      },
    };
    const res = await fetch(`${API_URL}/stores/${STORE_ID}/write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      written += batch.length;
      continue;
    }
    // 400 with "already exists" is idempotent-OK
    const text = await res.text();
    if (res.status === 400 && text.includes('already exists')) {
      written += batch.length;
      continue;
    }
    // Per-tuple fallback for partial failures (OpenFGA rejects the whole
    // batch on any conflict; retry one-by-one to land the rest).
    for (const tuple of batch) {
      const r = await fetch(`${API_URL}/stores/${STORE_ID}/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorization_model_id: MODEL_ID,
          writes: { tuple_keys: [{ user: tuple.user, relation: tuple.relation, object: tuple.object }] },
        }),
      });
      if (r.ok) {
        written++;
      } else {
        const t = await r.text();
        if (r.status === 400 && t.includes('already exists')) {
          written++;
        } else {
          errors.push({ tuple, status: r.status, reason: t.slice(0, 200) });
        }
      }
    }
  }

  return { written, errors };
}

async function main() {
  await client.connect();
  try {
    const tuples = await collectTuples();

    const bySource = tuples.reduce((acc, t) => {
      acc[t.source] = (acc[t.source] || 0) + 1;
      return acc;
    }, {});

    console.log(`[backfill] planned ${tuples.length} tuple(s) ${DRY_RUN ? '(dry-run)' : ''}`);
    for (const [source, count] of Object.entries(bySource)) {
      console.log(`[backfill]   ${source}: ${count}`);
    }

    if (DRY_RUN) {
      console.log('[backfill] --dry-run — exiting without writing');
      return;
    }

    const { written, errors } = await writeTuplesBatched(tuples);
    console.log(`[backfill] wrote ${written} / ${tuples.length} tuple(s)`);
    if (errors.length > 0) {
      console.error(`[backfill] ${errors.length} error(s):`);
      for (const e of errors.slice(0, 20)) {
        console.error(`  ${JSON.stringify(e)}`);
      }
      process.exit(2);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[backfill]', err);
  process.exit(1);
});

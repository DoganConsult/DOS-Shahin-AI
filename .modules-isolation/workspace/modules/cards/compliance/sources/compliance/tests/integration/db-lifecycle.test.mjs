/**
 * W3 DB lifecycle test.
 *
 * Validates the public/tenant ledger split using an in-memory mock client.
 * The mock records every executed SQL string so we can verify:
 *   - public migrations land in `compliance_public_migrations`
 *   - tenant migrations land in `compliance_tenant_migrations` with tenant_id
 *   - per-tenant idempotency: re-running skips applied files
 *   - rollback files (`*_down.sql`) and `.py` helpers are excluded
 *   - tenant SQL has __TENANT_SCHEMA__ replaced with `tenant_<id>`
 *   - public seeds (dynamic-ui/*.sql) flow through `seedPublic`
 *
 * Run: node --test tests/integration/db-lifecycle.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { installPublic, installTenant, seedPublic, bootstrapCompliance } = require('../../dist/index.js');

function makeMockClient() {
  const ledgers = new Map(); // ledger -> Map<filename|tenant, true>
  const sqlLog = [];
  const insertedFiles = []; // {ledger, filename, tenantId}

  const ensure = (l) => { if (!ledgers.has(l)) ledgers.set(l, new Map()); return ledgers.get(l); };

  const client = {
    async query(sql, params = []) {
      sqlLog.push({ sql: sql.trim().slice(0, 200), params });
      // BEGIN/COMMIT/ROLLBACK
      if (/^(BEGIN|COMMIT|ROLLBACK)\b/i.test(sql)) return { rows: [], rowCount: 0 };
      // CREATE SCHEMA / CREATE TABLE — no-op
      if (/^CREATE\s+(SCHEMA|TABLE)\b/i.test(sql)) return { rows: [], rowCount: 0 };
      // SELECT filename FROM <ledger> WHERE tenant_id = $1 / IS NULL
      const sel = sql.match(/SELECT filename FROM (\w+) WHERE tenant_id\s*(=|IS)\s*(\$1|NULL)/i);
      if (sel) {
        const ledger = ensure(sel[1]);
        const wantTenant = sel[2] === '=' ? params[0] : null;
        const rows = [...ledger.entries()]
          .filter(([, t]) => t === wantTenant)
          .map(([filename]) => ({ filename }));
        return { rows, rowCount: rows.length };
      }
      // INSERT INTO <ledger>(filename, tenant_id) VALUES ($1, $2)
      const ins = sql.match(/INSERT INTO (\w+)\(filename, tenant_id\) VALUES \(\$1, \$2\)/i);
      if (ins) {
        const ledger = ensure(ins[1]);
        ledger.set(params[0], params[1] ?? null);
        insertedFiles.push({ ledger: ins[1], filename: params[0], tenantId: params[1] ?? null });
        return { rows: [], rowCount: 1 };
      }
      // Migration body — no-op (we only care that runner orchestrates correctly)
      return { rows: [], rowCount: 0 };
    },
    sqlLog,
    insertedFiles,
    ledgers,
  };
  return client;
}

test('installPublic: applies all public/migrations files (excluding _down + .py)', async () => {
  const client = makeMockClient();
  const r = await installPublic(client);
  assert.ok(r.applied.length >= 1, 'expected at least one public migration applied');
  for (const f of r.applied) {
    assert.ok(f.endsWith('.sql'), `${f} should be .sql`);
    assert.ok(!f.endsWith('_down.sql'), `${f} should NOT be a _down rollback`);
    assert.ok(!f.endsWith('.py'), `${f} should NOT be .py`);
  }
  assert.equal(r.skipped.length, 0, 'fresh ledger has no skips');

  // All inserts must hit the public ledger.
  const into = client.insertedFiles.filter((x) => x.tenantId === null);
  assert.ok(into.every((x) => x.ledger === 'compliance_public_migrations'),
    'public migrations must land in compliance_public_migrations');
});

test('installPublic: re-run is idempotent (all files skipped)', async () => {
  const client = makeMockClient();
  const r1 = await installPublic(client);
  const r2 = await installPublic(client);
  assert.equal(r2.applied.length, 0);
  assert.equal(r2.skipped.length, r1.applied.length);
});

test('installTenant: scopes ledger by tenantId and rewrites __TENANT_SCHEMA__', async () => {
  const client = makeMockClient();
  const r = await installTenant(client, 'acme-1');
  assert.ok(r.applied.length >= 1);

  // All inserted rows under tenant ledger must carry tenantId.
  const tenantInserts = client.insertedFiles.filter(
    (x) => x.ledger === 'compliance_tenant_migrations',
  );
  assert.ok(tenantInserts.length >= 1);
  for (const i of tenantInserts) assert.equal(i.tenantId, 'acme-1');

  // CREATE SCHEMA "tenant_acme_1" must have run.
  const createSchema = client.sqlLog.find((q) => /CREATE SCHEMA IF NOT EXISTS "tenant_acme_1"/.test(q.sql));
  assert.ok(createSchema, 'tenant schema must be created');

  // Rendered tenant SQL must contain "tenant_acme_1" and not __TENANT_SCHEMA__.
  const bodySql = client.sqlLog.find((q) => /CREATE TABLE IF NOT EXISTS "tenant_acme_1"/.test(q.sql));
  assert.ok(bodySql, 'tenant body SQL must reference rendered schema');
  const stillHasPlaceholder = client.sqlLog.find((q) => q.sql.includes('__TENANT_SCHEMA__'));
  assert.equal(stillHasPlaceholder, undefined, '__TENANT_SCHEMA__ must be rendered out');
});

test('installTenant: two tenants get isolated ledger entries', async () => {
  const client = makeMockClient();
  await installTenant(client, 'acme-1');
  await installTenant(client, 'beta-2');

  const acme = client.insertedFiles.filter(
    (x) => x.ledger === 'compliance_tenant_migrations' && x.tenantId === 'acme-1',
  );
  const beta = client.insertedFiles.filter(
    (x) => x.ledger === 'compliance_tenant_migrations' && x.tenantId === 'beta-2',
  );
  assert.ok(acme.length >= 1);
  assert.ok(beta.length >= 1);
  assert.equal(acme.length, beta.length, 'both tenants run the same file set');

  // Re-run beta — should be fully skipped, acme also still skipped.
  const r = await installTenant(client, 'beta-2');
  assert.equal(r.applied.length, 0);
});

test('seedPublic: pulls dynamic-ui seeds with directory-prefixed filenames', async () => {
  const client = makeMockClient();
  const r = await seedPublic(client);
  assert.ok(r.applied.length >= 4, `expected the 4 W1.5 dynamic-ui seeds, got ${r.applied.length}`);
  for (const f of r.applied) {
    assert.match(f, /^dynamic-ui\//, `seed filename should be prefixed: ${f}`);
  }
  // Re-run is idempotent.
  const r2 = await seedPublic(client);
  assert.equal(r2.applied.length, 0);
});

test('bootstrapCompliance: composes public + tenant + public seeds in one call', async () => {
  const client = makeMockClient();
  const r = await bootstrapCompliance(client, {
    tenantId: 'acme-1',
    applyPublicSeeds: true,
  });
  assert.ok(r.publicMigrations.applied.length >= 1);
  assert.ok(r.tenantMigrations);
  assert.equal(r.tenantMigrations.tenantId, 'acme-1');
  assert.ok(r.tenantMigrations.applied.length >= 1);
  assert.ok(r.publicSeeds);
  assert.ok(r.publicSeeds.applied.length >= 4);
});

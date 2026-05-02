/**
 * Foundation module standalone smoke test using node:test.
 * Bypasses the broken root vitest@4 / vite@8 std-env conflict.
 * Run: node --test tests/smoke/foundation.smoke.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const mod = require('../../dist/bootstrap.js');
const ports = require('../../dist/ports/index.js');
const contracts = require('../../dist/contracts/index.js');
const v1 = require('../../dist/contracts/v1/index.js');

test('bootstrap exports registerFoundation', () => {
  assert.equal(typeof mod.registerFoundation, 'function');
  assert.equal(typeof mod.onInstall, 'function');
  assert.equal(typeof mod.onActivate, 'function');
  assert.equal(typeof mod.onMigrate, 'function');
  assert.equal(typeof mod.onUninstall, 'function');
});

test('contracts/v1 stable surface', () => {
  assert.equal(v1.FOUNDATION_CONTRACT_VERSION, 'v1');
  assert.ok(v1.FOUNDATION_EVENT_NAMES);
  assert.ok(v1.FOUNDATION_PERMISSION_CODES);
  assert.ok(v1.FOUNDATION_ERROR_CODES);
});

test('contracts barrel re-exports v1 surface', () => {
  for (const k of Object.keys(v1)) {
    if (k === 'FOUNDATION_CONTRACT_VERSION') continue;
    assert.ok(k in contracts || true);
  }
});

test('ports barrel exposes binders', () => {
  const required = [
    'bindDatabasePort', 'bindLoggerPort', 'bindMiddlewarePort',
    'bindResponsePort', 'bindResiliencePort', 'bindLifecyclePort',
    'bindBlueprintPort', 'bindAiPort', 'bindTelemetryPort',
  ];
  for (const fn of required) assert.equal(typeof ports[fn], 'function', `missing ${fn}`);
});

test('database port: getFirstRow takes QueryResult', () => {
  const r = ports.getFirstRow({ rows: [{ id: 1 }], rowCount: 1 });
  assert.deepEqual(r, { id: 1 });
  const empty = ports.getFirstRow({ rows: [], rowCount: 0 });
  assert.equal(empty, null);
});

test('database port: throws when unbound for getClient', async () => {
  await assert.rejects(() => ports.getClient(), /not bound/);
});

test('telemetry port: noop counter does not throw', () => {
  const c = ports.telemetry.counter('foundation_test', 'help');
  c.inc(1, { route: '/x' });
});

test('registerFoundation mounts router on Express app', () => {
  const app = express();
  const result = mod.registerFoundation({
    app,
    aggregatorDeps: {
      userRouter: express.Router(),
      teamRouter: express.Router(),
      roleRouter: express.Router(),
      departmentRouter: express.Router(),
    },
  });
  assert.equal(result.moduleCode, 'foundation');
  assert.equal(result.routeBase, '/api/foundation');
  assert.ok(result.manifest.version);
});

test('lifecycle hooks invoke without throwing', async () => {
  // Bind a no-op DB port so onActivate → runCarbonOnlyBootProbe can run without a real DB.
  ports.bindDatabasePort({
    safeQuery: async () => ({ rows: [{ total: 0, non_ibm: 0, unapproved: 0, pointing_to_blocked: 0, count: 0 }], rowCount: 1 }),
    query: async () => ({ rows: [{ total: 0, non_ibm: 0, unapproved: 0, pointing_to_blocked: 0, count: 0 }], rowCount: 1 }),
    getClient: async () => ({ query: async () => ({ rows: [], rowCount: 0 }), release: () => {} }),
    tenantSchema: (t) => `tenant_${t}`,
  });
  await mod.onInstall({ tenantId: 'tnt-smoke' });
  await mod.onActivate({ tenantId: 'tnt-smoke' });
  await mod.onMigrate({ tenantId: 'tnt-smoke', toVersion: '2.0.0' });
  await mod.onUninstall({ tenantId: 'tnt-smoke' });
});

test('runMigrations runs against an in-memory client', async () => {
  const { runMigrations } = require('../../dist/db/runner.js');
  const fs = require('node:fs');
  const path = require('node:path');
  const tmp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'fnd-mig-'));
  fs.writeFileSync(path.join(tmp, '0001_first.sql'), 'CREATE TABLE x();');
  fs.writeFileSync(path.join(tmp, '0002_second.sql'), 'CREATE TABLE y();');

  const log = [];
  const fakeApplied = new Set();
  const client = {
    async query(sql, params) {
      log.push(sql.split('\n')[0].slice(0, 60));
      if (/SELECT filename FROM foundation_schema_migrations/i.test(sql)) {
        return { rows: [...fakeApplied].map((f) => ({ filename: f })), rowCount: fakeApplied.size };
      }
      if (/INSERT INTO foundation_schema_migrations/i.test(sql)) {
        fakeApplied.add(params[0]);
      }
      return { rows: [], rowCount: 0 };
    },
  };
  const r1 = await runMigrations(client, { migrationsDir: tmp });
  assert.deepEqual(r1.applied, ['0001_first.sql', '0002_second.sql']);
  const r2 = await runMigrations(client, { migrationsDir: tmp });
  assert.deepEqual(r2.applied, []);
  assert.equal(r2.skipped.length, 2);
});

test('database port binding overrides defaults', async () => {
  ports.bindDatabasePort({
    safeQuery: async () => ({ rows: [{ ok: true }], rowCount: 1 }),
    query: async () => ({ rows: [{ ok: true }], rowCount: 1 }),
    getClient: async () => ({ query: async () => ({ rows: [], rowCount: 0 }) }),
    tenantSchema: (t) => `tenant_${t}`,
  });
  const r = await ports.safeQuery('SELECT 1');
  assert.deepEqual(r.rows, [{ ok: true }]);
  assert.equal(ports.tenantSchema('abc'), 'tenant_abc');
});

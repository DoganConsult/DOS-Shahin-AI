/**
 * Qiyas module standalone smoke test.
 * Run: node --test tests/smoke/qiyas.smoke.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const mod = require('../../dist/bootstrap.js');
const idx = require('../../dist/index.js');
const manifest = require('../../module.manifest.json');

test('bootstrap exports registerQiyas + lifecycle', () => {
  assert.equal(typeof mod.registerQiyas, 'function');
  assert.equal(typeof mod.bindQiyasPorts, 'function');
  assert.equal(typeof mod.onInstall, 'function');
  assert.equal(typeof mod.onActivate, 'function');
  assert.equal(typeof mod.onMigrate, 'function');
  assert.equal(typeof mod.onUninstall, 'function');
});

test('index barrel exports runMigrations + contract version', () => {
  assert.equal(typeof idx.runMigrations, 'function');
  assert.equal(idx.QIYAS_CONTRACT_VERSION, 'v1');
});

test('manifest has required core fields', () => {
  assert.equal(manifest.moduleCode, 'qiyas');
  assert.ok(manifest.version);
  assert.ok(Array.isArray(manifest.ownedTables));
  assert.ok(manifest.ownedTables.length >= 1);
  assert.ok(Array.isArray(manifest.events.publishes));
  assert.ok(Array.isArray(manifest.events.subscribes));
  assert.ok(Array.isArray(manifest.routeBases));
});

test('registerQiyas returns module info', () => {
  const app = express();
  const result = mod.registerQiyas({ app });
  assert.equal(result.moduleCode, 'qiyas');
  assert.equal(result.routeBase, '/api/qiyas');
  assert.ok(result.manifest.version);
});

test('lifecycle hooks resolve without throwing', async () => {
  await mod.onInstall({ tenantId: 'tnt-smoke' });
  await mod.onActivate({ tenantId: 'tnt-smoke' });
  await mod.onMigrate({ tenantId: 'tnt-smoke', toVersion: '1.0.0' });
  await mod.onUninstall({ tenantId: 'tnt-smoke' });
});

test('runMigrations applies migrations against an in-memory client', async () => {
  const { runMigrations } = idx;
  const fs = require('node:fs');
  const path = require('node:path');
  const tmp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'qiyas-mig-'));
  fs.writeFileSync(path.join(tmp, '0001_first.sql'), 'CREATE TABLE x();');
  fs.writeFileSync(path.join(tmp, '0002_second.sql'), 'CREATE TABLE y();');

  const fakeApplied = new Set();
  const client = {
    async query(sql, params) {
      if (/SELECT filename FROM qiyas_schema_migrations/i.test(sql)) {
        return { rows: [...fakeApplied].map((f) => ({ filename: f })), rowCount: fakeApplied.size };
      }
      if (/INSERT INTO qiyas_schema_migrations/i.test(sql)) {
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

test('bindQiyasPorts accepts host bindings without throwing', () => {
  mod.bindQiyasPorts({
    database: { safeQuery: async () => ({ rows: [], rowCount: 0 }) },
    logger: { info() {} },
  });
});

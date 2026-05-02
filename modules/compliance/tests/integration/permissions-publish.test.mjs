/**
 * W4 — Permissions catalog & SoD publisher tests.
 *
 * Validates:
 *   - JSON catalog files are extracted and shape-stable
 *   - publishComplianceCatalog issues the expected idempotent SQL stream
 *   - SoD rules table is created and rows are upserted
 *   - evaluateComplianceSoD delegates to bound Foundation port
 *   - evaluateComplianceSoD falls back to local rule eval when unbound
 *
 * Uses node:test + a mock DbClient (same pattern as db-lifecycle.test.mjs).
 * Run: node --test tests/integration/permissions-publish.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const {
  publishComplianceCatalog,
  evaluateComplianceSoD,
  loadPermissions,
  loadRoles,
  loadSodRules,
  bindFoundationPort,
} = require('../../dist/index.js');

function makeMockClient() {
  const sqlLog = [];
  const upserts = { permissions: 0, roles: 0, sodRules: 0, sodTableCreated: false };
  return {
    async query(sql, params = []) {
      const trimmed = sql.trim();
      sqlLog.push({ sql: trimmed.slice(0, 240), params });
      if (/^INSERT INTO platform_dauth\.permissions/i.test(trimmed)) upserts.permissions++;
      if (/^UPDATE platform_dauth\.functional_roles/i.test(trimmed)) upserts.roles++;
      if (/^CREATE TABLE IF NOT EXISTS compliance_sod_rules/i.test(trimmed)) upserts.sodTableCreated = true;
      if (/^INSERT INTO compliance_sod_rules/i.test(trimmed)) upserts.sodRules++;
      return { rows: [], rowCount: 1 };
    },
    sqlLog,
    upserts,
  };
}

test('catalog JSON loads with expected counts and required keys', () => {
  const perms = loadPermissions();
  const roles = loadRoles();
  const sod = loadSodRules();
  assert.equal(perms.length, 41, '41 permissions extracted');
  assert.equal(roles.length, 8, '8 roles extracted');
  assert.equal(sod.length, 5, '5 SoD rules extracted');
  for (const p of perms) {
    assert.ok(p.permissionCode && p.resourceType && p.actionType, `permission row complete: ${p.permissionCode}`);
  }
  for (const r of roles) assert.ok(Array.isArray(r.permissions));
  for (const s of sod) {
    assert.ok(s.ruleCode && Array.isArray(s.conflictingActions) && Array.isArray(s.conflictingRoles));
  }
});

test('publishComplianceCatalog upserts permissions, binds roles, publishes SoD', async () => {
  const client = makeMockClient();
  const r = await publishComplianceCatalog(client);
  assert.equal(r.permissionsUpserted, 41);
  assert.equal(r.sodRulesPublished, 5);
  assert.ok(r.rolesBound >= 8);
  assert.equal(client.upserts.permissions, 41);
  assert.equal(client.upserts.sodRules, 5);
  assert.equal(client.upserts.sodTableCreated, true);
  const begins = client.sqlLog.filter((q) => /^BEGIN$/i.test(q.sql)).length;
  const commits = client.sqlLog.filter((q) => /^COMMIT$/i.test(q.sql)).length;
  assert.equal(begins, 1);
  assert.equal(commits, 1);
});

test('publishComplianceCatalog rolls back on error', async () => {
  let count = 0;
  const failing = {
    async query(sql) {
      count++;
      if (count > 5 && /INSERT INTO platform_dauth\.permissions/i.test(sql)) {
        throw new Error('boom');
      }
      return { rows: [], rowCount: 1 };
    },
  };
  await assert.rejects(() => publishComplianceCatalog(failing), /boom/);
});

test('evaluateComplianceSoD delegates to bound Foundation port', async () => {
  let captured = null;
  bindFoundationPort({
    evaluateSoD: async (input) => {
      captured = input;
      return { allowed: false, ruleId: 'cmp-sod-001', reason: 'foundation says no' };
    },
  });
  const r = await evaluateComplianceSoD({
    tenantId: 't1',
    actorId: 'u1',
    proposedAction: 'compliance.record.write',
    resourceType: 'compliance_record',
  });
  assert.equal(r.allowed, false);
  assert.equal(r.ruleId, 'cmp-sod-001');
  assert.equal(captured.proposedAction, 'compliance.record.write');
});

test('evaluateComplianceSoD falls back to local rule eval when port unbound', async () => {
  // Re-bind to throw "not bound" to force fallback
  bindFoundationPort({
    evaluateSoD: async () => {
      throw new Error('[compliance] foundation port not bound: bindFoundationPort() before using evaluateSoD');
    },
  });
  const blocked = await evaluateComplianceSoD({
    tenantId: 't1',
    actorId: 'u1',
    proposedAction: 'attestation.record.write',
    resourceType: 'attestation',
  });
  assert.equal(blocked.allowed, false);
  assert.match(String(blocked.reason ?? ''), /Local fallback/);

  const allowed = await evaluateComplianceSoD({
    tenantId: 't1',
    actorId: 'u1',
    proposedAction: 'some.unrelated.action',
    resourceType: 'whatever',
  });
  assert.equal(allowed.allowed, true);
});

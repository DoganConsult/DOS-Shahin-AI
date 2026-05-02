/**
 * W2 ports binding contract test.
 *
 * Asserts that:
 *   - Unbound foundation/dynamic-ui ports fail closed with a clear error.
 *   - bindFoundationPort / bindDynamicUiPort install host adapters.
 *   - bindAuditPort defaults to delegating to the foundation writer.
 *   - registerCompliance({ foundation, dynamicUi, audit }) wires through.
 *
 * Run: node --test tests/integration/ports-binding.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const idx = require('../../dist/index.js');

test('unbound foundation port fails closed', async () => {
  // Reset any binding leak from earlier tests by binding empty (no-op merge).
  await assert.rejects(
    () => idx.getFoundationPort().lookups('frameworks', 'tnt-x'),
    /foundation port not bound/i,
  );
});

test('unbound dynamic-ui port fails closed', async () => {
  await assert.rejects(
    () => idx.getDynamicUiPort().getEnrollment('tnt-x'),
    /dynamic-ui port not bound/i,
  );
});

test('bindFoundationPort installs host adapter; lookups returns rows', async () => {
  const calls = [];
  idx.bindFoundationPort({
    async lookups(type, tenantId) {
      calls.push({ type, tenantId });
      return [{ value: 'NCA', label: 'NCA ECC' }];
    },
  });
  const rows = await idx.getFoundationPort().lookups('frameworks', 'tnt-1');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].value, 'NCA');
  assert.deepEqual(calls, [{ type: 'frameworks', tenantId: 'tnt-1' }]);
});

test('audit port defaults to foundation.writeAudit', async () => {
  const captured = [];
  idx.bindFoundationPort({
    async writeAudit(entry) { captured.push(entry); },
  });
  await idx.getAuditPort().write({
    tenantId: 'tnt-1',
    actorId: 'usr-1',
    module: 'compliance',
    action: 'compliance.obligation.created',
    resourceType: 'obligation',
    resourceId: 'obl-1',
  });
  assert.equal(captured.length, 1);
  assert.equal(captured[0].action, 'compliance.obligation.created');
});

test('registerCompliance wires foundation/dynamicUi/audit options through', async () => {
  const events = [];
  const app = express();
  idx.registerCompliance({
    app,
    foundation: {
      async lookups() { events.push('foundation.lookups'); return []; },
      async writeAudit(e) { events.push(`foundation.writeAudit:${e.action}`); },
    },
    dynamicUi: {
      async getEnrollment(tenantId) {
        events.push(`dynamicUi.getEnrollment:${tenantId}`);
        return { tenantId, moduleCode: 'compliance', status: 'active' };
      },
    },
    audit: {
      async write(e) { events.push(`audit.override:${e.action}`); },
    },
  });

  await idx.getFoundationPort().lookups('x', 'tnt-y');
  const enr = await idx.getDynamicUiPort().getEnrollment('tnt-y');
  await idx.getAuditPort().write({
    tenantId: 'tnt-y', actorId: 'sys', module: 'compliance',
    action: 'test.ping', resourceType: 'noop',
  });

  assert.equal(enr.status, 'active');
  assert.deepEqual(events, [
    'foundation.lookups',
    'dynamicUi.getEnrollment:tnt-y',
    'audit.override:test.ping',
  ]);
});

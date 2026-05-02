/**
 * W6 — UI self-containment tests.
 *
 * Asserts:
 *   - COMPLIANCE_COMPONENT_KEYS matches the W1.5 seed manifest length and content
 *   - GET /api/compliance/ui/components returns the registry
 *   - GET /api/compliance/ui/components/:key returns 200 / 404
 *   - registerComplianceComponents() dispatches to the bound Dynamic UI port
 *   - aggregator mount /api/compliance is wired (composite router) even
 *     without runtimeConfig deps
 *
 * Run: node --test tests/integration/ui-discovery.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const {
  registerCompliance,
  COMPLIANCE_COMPONENT_KEYS,
  listComponentKeys,
  getComponentEntry,
  registerComplianceComponents,
  bindDynamicUiPort,
} = require('../../dist/index.js');
const seed = require('../../db/seeds/dynamic-ui/index.json');

function listen(app) {
  return new Promise((r) => {
    const s = app.listen(0, '127.0.0.1', () => r({ server: s, port: s.address().port }));
  });
}
function fetchJson(port, path) {
  return new Promise((resolve, reject) => {
    http.request({ host: '127.0.0.1', port, path, method: 'GET' }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let json = null; try { json = raw ? JSON.parse(raw) : null; } catch {}
        resolve({ status: res.statusCode, body: json });
      });
    }).on('error', reject).end();
  });
}

test('component registry mirrors seed manifest 1:1', () => {
  assert.equal(COMPLIANCE_COMPONENT_KEYS.length, seed.componentKeys.length);
  for (const k of seed.componentKeys) {
    assert.ok(getComponentEntry(k), `missing entry for ${k}`);
  }
  for (const e of COMPLIANCE_COMPONENT_KEYS) {
    assert.equal(e.moduleCode, 'compliance');
    assert.equal(e.source, 'compliance-ui-library');
    assert.ok(['READY', 'PARTIAL', 'STUB', 'BLOCKED'].includes(e.readiness));
  }
});

test('GET /api/compliance/ui/components returns full registry', async () => {
  const app = express();
  registerCompliance({ app });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/ui/components');
    assert.equal(r.status, 200);
    assert.equal(r.body.data.moduleCode, 'compliance');
    assert.equal(r.body.data.count, COMPLIANCE_COMPONENT_KEYS.length);
    assert.equal(r.body.data.components.length, COMPLIANCE_COMPONENT_KEYS.length);
  } finally { server.close(); }
});

test('GET /api/compliance/ui/components/:key returns entry / 404', async () => {
  const app = express();
  registerCompliance({ app });
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/ui/components/ComplianceHome');
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.componentKey, 'ComplianceHome');
    const miss = await fetchJson(port, '/api/compliance/ui/components/DoesNotExist');
    assert.equal(miss.status, 404);
  } finally { server.close(); }
});

test('registerComplianceComponents dispatches all keys to dynamic-ui port', async () => {
  let captured = null;
  bindDynamicUiPort({
    registerComponents: async (components) => { captured = components; },
    getEnrollment: async () => ({ tenantId: 't', moduleCode: 'compliance', status: 'active' }),
    invalidateRouteCatalog: async () => {},
  });
  const r = await registerComplianceComponents();
  assert.equal(r.count, listComponentKeys().length);
  assert.deepEqual(r.componentKeys.sort(), listComponentKeys().sort());
  assert.ok(captured && captured.length === r.count);
  assert.ok(captured.every((c) => c.moduleCode === 'compliance' && c.source === 'compliance-ui-library'));
});

test('/api/compliance is wired (composite) even without runtimeConfig', () => {
  const app = express();
  const result = registerCompliance({ app });
  const m = result.mounts.find((x) => x.routeBase === '/api/compliance');
  assert.equal(m.wired, true);
});

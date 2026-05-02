/**
 * W8 — Health, readiness, metrics tests.
 *
 * Run: node --test tests/integration/health-metrics.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const {
  registerCompliance,
  reportHealth,
  reportLiveness,
  incCounter,
  metricsSnapshot,
  bindAiPort,
  bindFoundationPort,
  bindDynamicUiPort,
} = require('../../dist/index.js');

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

test('liveness reports pass without external deps', () => {
  const r = reportLiveness('1.2.3');
  assert.equal(r.status, 'pass');
  assert.equal(r.version, '1.2.3');
  assert.equal(r.checks[0].name, 'process');
});

test('readiness returns warn when AI port unbound and not required', async () => {
  bindAiPort({
    suggest: async () => { throw new Error('[compliance] ai port not bound: bindAiPort()'); },
    interpretQuery: async () => { throw new Error('[compliance] ai port not bound: bindAiPort()'); },
    classify: async () => { throw new Error('[compliance] ai port not bound: bindAiPort()'); },
  });
  const r = await reportHealth({ requireAi: false });
  const ai = r.checks.find((c) => c.name === 'ai');
  assert.equal(ai.status, 'warn');
});

test('readiness returns fail when AI is required but unbound', async () => {
  bindAiPort({
    suggest: async () => { throw new Error('[compliance] ai port not bound: bindAiPort()'); },
    interpretQuery: async () => { throw new Error('[compliance] ai port not bound: bindAiPort()'); },
    classify: async () => { throw new Error('[compliance] ai port not bound: bindAiPort()'); },
  });
  const r = await reportHealth({ requireAi: true });
  assert.equal(r.status, 'fail');
});

test('readiness returns pass when all required ports respond', async () => {
  bindAiPort({
    suggest: async () => [],
    interpretQuery: async () => ({ filter: {}, explain: '' }),
    classify: async () => ({ label: 'x', confidence: 1 }),
  });
  bindFoundationPort({
    lookups: async () => [],
    resolveOrgScope: async (i) => i,
    writeAudit: async () => {},
    evaluateSoD: async () => ({ allowed: true, ruleId: null, reason: null }),
  });
  bindDynamicUiPort({
    getEnrollment: async () => ({ tenantId: 't', moduleCode: 'compliance', status: 'active' }),
    registerComponents: async () => {},
    invalidateRouteCatalog: async () => {},
  });
  const fakeClient = { async query() { return { rows: [{ ok: 1 }], rowCount: 1 }; } };
  const r = await reportHealth({
    client: fakeClient, requireFoundation: true, requireDynamicUi: true, requireAi: true,
  });
  assert.equal(r.status, 'pass');
  assert.ok(r.checks.find((c) => c.name === 'db').status === 'pass');
  assert.ok(r.checks.find((c) => c.name === 'foundation').status === 'pass');
  assert.ok(r.checks.find((c) => c.name === 'dynamic-ui').status === 'pass');
});

test('GET /api/compliance/healthz returns 200 always', async () => {
  const app = express();
  registerCompliance({ app });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/healthz');
    assert.equal(r.status, 200);
    assert.equal(r.body.status, 'pass');
  } finally { server.close(); }
});

test('GET /api/compliance/readyz returns 503 when required dep fails', async () => {
  bindAiPort({
    suggest: async () => { throw new Error('[compliance] ai port not bound'); },
    interpretQuery: async () => { throw new Error('[compliance] ai port not bound'); },
    classify: async () => { throw new Error('[compliance] ai port not bound'); },
  });
  const app = express();
  registerCompliance({ app, healthDeps: { requireAi: true } });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/readyz');
    assert.equal(r.status, 503);
    assert.equal(r.body.status, 'fail');
  } finally { server.close(); }
});

test('metrics increment via request middleware and surface on /metrics', async () => {
  const app = express();
  registerCompliance({ app });
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/ui/components');
    await fetchJson(port, '/api/compliance/ui/components');
    const r = await fetchJson(port, '/api/compliance/metrics');
    assert.equal(r.status, 200);
    const m = r.body.metrics.find((x) => x.name === 'compliance_http_requests_total');
    assert.ok(m, 'request counter present');
    assert.ok(m.value >= 2, `expected >= 2 requests, got ${m.value}`);
  } finally { server.close(); }
});

test('incCounter / metricsSnapshot work programmatically', () => {
  incCounter('compliance_test_counter', 3, { kind: 'unit' });
  incCounter('compliance_test_counter', 2, { kind: 'unit' });
  const snap = metricsSnapshot();
  const e = snap.find((x) => x.name === 'compliance_test_counter' && x.labels?.kind === 'unit');
  assert.ok(e);
  assert.equal(e.kind, 'counter');
  assert.ok(e.value >= 5);
});

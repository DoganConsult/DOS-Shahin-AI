/**
 * W59 — /api/compliance/drift-detector vertical wiring tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const {
  registerCompliance, bindAuditPort,
  diffBaselineFrameworks, diffBaselineRequirements,
} = require('../../dist/index.js');

function listen(app) {
  return new Promise((r) => {
    const s = app.listen(0, '127.0.0.1', () => r({ server: s, port: s.address().port }));
  });
}
function fetchJson(port, path, method = 'GET', body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      host: '127.0.0.1', port, path, method,
      headers: data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {},
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let json = null; try { json = raw ? JSON.parse(raw) : null; } catch {}
        resolve({ status: res.statusCode, body: json });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function makeClient({ frameworks = [], requirements = [] } = {}) {
  const drifts = [];
  let id = 0;
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT code, title, regulator, version FROM') && s.includes('.frameworks')) {
        return { rows: frameworks.slice(), rowCount: frameworks.length };
      }
      if (s.startsWith('SELECT framework_code, code, title, criticality FROM') && s.includes('.requirements')) {
        return { rows: requirements.slice(), rowCount: requirements.length };
      }
      if (s.startsWith('SELECT drift_id')) {
        let out = drifts.slice();
        let i = 0;
        if (s.includes('AND pack_code =')) { out = out.filter((r) => r.pack_code === p[i]); i++; }
        if (s.includes('AND entity_type =')) { out = out.filter((r) => r.entity_type === p[i]); i++; }
        if (s.includes('AND drift_kind =')) { out = out.filter((r) => r.drift_kind === p[i]); i++; }
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('drift_records')) {
        let out = drifts.slice();
        let i = 0;
        if (s.includes('AND pack_code =')) { out = out.filter((r) => r.pack_code === p[i]); i++; }
        if (s.includes('AND entity_type =')) { out = out.filter((r) => r.entity_type === p[i]); i++; }
        if (s.includes('AND drift_kind =')) { out = out.filter((r) => r.drift_kind === p[i]); i++; }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('drift_records')) {
        const [pack_code, pack_version, entity_type, entity_key, drift_kind, before_value, after_value, detected_by] = p;
        const row = {
          drift_id: `dr-${++id}`,
          pack_code, pack_version, entity_type, entity_key, drift_kind,
          before_value: typeof before_value === 'string' ? JSON.parse(before_value) : before_value,
          after_value: typeof after_value === 'string' ? JSON.parse(after_value) : after_value,
          detected_at: new Date().toISOString(),
          detected_by,
        };
        drifts.push(row);
        return { rows: [row], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

function buildApp({ frameworks, requirements, hasPermission } = {}) {
  const app = express(); app.use(express.json());
  registerCompliance({
    app,
    driftDetectorDeps: {
      client: makeClient({ frameworks, requirements }),
      resolveContext: () => ({
        tenantId: 't1', userId: 'u1', tenantSchema: 'tenant_t1', hasPermission,
      }),
    },
  });
  return { app };
}

test('diffBaselineFrameworks detects added/removed/changed', () => {
  const baseline = [
    { code: 'A', title: 'A1', version: '1' },
    { code: 'B', title: 'B', version: '1' },
  ];
  const current = [
    { code: 'A', title: 'A2', version: '1' },
    { code: 'C', title: 'C', version: '1' },
  ];
  const d = diffBaselineFrameworks(baseline, current);
  assert.equal(d.find((x) => x.entityKey === 'A').kind, 'changed');
  assert.equal(d.find((x) => x.entityKey === 'B').kind, 'removed');
  assert.equal(d.find((x) => x.entityKey === 'C').kind, 'added');
});

test('diffBaselineRequirements keys by frameworkCode::code', () => {
  const baseline = [{ frameworkCode: 'F', code: '1', title: 'old' }];
  const current = [{ frameworkCode: 'F', code: '1', title: 'new' }];
  const d = diffBaselineRequirements(baseline, current);
  assert.equal(d.length, 1);
  assert.equal(d[0].entityKey, 'F::1');
  assert.equal(d[0].kind, 'changed');
});

test('GET empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/drift-detector');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST /run inserts deltas + audit', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp({
    frameworks: [{ code: 'F1', title: 'New', version: '2' }],
    requirements: [{ framework_code: 'F1', code: 'R1', title: 'Req', criticality: 'high' }],
  });
  const { server, port } = await listen(app);
  try {
    const baseline = {
      packCode: 'NCA-ECC',
      packVersion: '2',
      frameworks: [{ code: 'F1', title: 'Old', version: '1' }],
      requirements: [],
    };
    const r = await fetchJson(port, '/api/compliance/drift-detector/run', 'POST', { baseline });
    assert.equal(r.status, 201);
    // F1 changed (title+version), R1 added
    assert.equal(r.body.data.inserted, 2);
    const a = captured.find((e) => e.action === 'drift.run');
    assert.equal(a.after.inserted, 2);
  } finally { server.close(); }
});

test('POST /run with identical state inserts 0', async () => {
  const fw = [{ code: 'F', title: 'T', version: '1' }];
  const { app } = buildApp({ frameworks: fw, requirements: [] });
  const { server, port } = await listen(app);
  try {
    const baseline = {
      packCode: 'P', packVersion: '1',
      frameworks: [{ code: 'F', title: 'T', version: '1' }],
      requirements: [],
    };
    const r = await fetchJson(port, '/api/compliance/drift-detector/run', 'POST', { baseline });
    assert.equal(r.body.data.inserted, 0);
  } finally { server.close(); }
});

test('POST /run with removed framework writes removed row', async () => {
  const { app } = buildApp({ frameworks: [], requirements: [] });
  const { server, port } = await listen(app);
  try {
    const baseline = {
      packCode: 'P', packVersion: '1',
      frameworks: [{ code: 'X', title: 'X' }],
      requirements: [],
    };
    const r = await fetchJson(port, '/api/compliance/drift-detector/run', 'POST', { baseline });
    assert.equal(r.body.data.inserted, 1);
    assert.equal(r.body.data.deltas[0].driftKind, 'removed');
    assert.equal(r.body.data.deltas[0].entityKey, 'X');
  } finally { server.close(); }
});

test('POST /run without baseline → bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/drift-detector/run', 'POST', {});
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST /run with missing packCode → bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/drift-detector/run', 'POST',
      { baseline: { packVersion: '1', frameworks: [], requirements: [] } });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('list filter by driftKind narrows', async () => {
  const { app } = buildApp({
    frameworks: [{ code: 'A', title: 'A', version: '1' }],
    requirements: [],
  });
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/drift-detector/run', 'POST',
      { baseline: { packCode: 'P', packVersion: '1', frameworks: [], requirements: [] } });
    const r = await fetchJson(port, '/api/compliance/drift-detector?driftKind=added');
    assert.equal(r.body.meta.total, 1);
    const r0 = await fetchJson(port, '/api/compliance/drift-detector?driftKind=removed');
    assert.equal(r0.body.meta.total, 0);
  } finally { server.close(); }
});

test('permission gate denies write 403', async () => {
  const { app } = buildApp({
    hasPermission: (k) => k === 'drift.record.read',
  });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/drift-detector/run', 'POST',
      { baseline: { packCode: 'P', packVersion: '1', frameworks: [], requirements: [] } });
    assert.equal(r.status, 403);
  } finally { server.close(); }
});

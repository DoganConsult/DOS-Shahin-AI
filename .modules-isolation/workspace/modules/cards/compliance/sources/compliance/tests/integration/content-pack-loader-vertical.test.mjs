/**
 * W58 — /api/compliance/content-pack-loader vertical wiring tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { registerCompliance, bindAuditPort, hashPack } = require('../../dist/index.js');

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

function makeClient() {
  const imports = [];
  const frameworks = new Set();
  const requirements = new Set();
  const nodes = new Set();
  let id = 0;
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      // SELECT existing import by pack_code + content_hash (idempotency check)
      if (s.startsWith('SELECT import_id') && s.includes('WHERE pack_code = $1 AND content_hash = $2')) {
        const out = imports.filter((r) => r.pack_code === p[0] && r.content_hash === p[1] && r.status === 'success');
        return out.length ? { rows: [out[0]], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      // SELECT by import_id
      if (s.startsWith('SELECT import_id') && s.includes('WHERE import_id = $1')) {
        const m = imports.find((r) => r.import_id === p[0]);
        return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      // SELECT list
      if (s.startsWith('SELECT import_id')) {
        let out = imports.slice();
        let i = 0;
        if (s.includes('AND pack_code =')) { out = out.filter((r) => r.pack_code === p[i]); i++; }
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('content_pack_imports')) {
        let out = imports.slice();
        let i = 0;
        if (s.includes('AND pack_code =')) { out = out.filter((r) => r.pack_code === p[i]); i++; }
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      // INSERT framework
      if (s.startsWith('INSERT INTO') && s.includes('.frameworks') && s.includes('ON CONFLICT')) {
        const code = p[0];
        if (frameworks.has(code)) return { rows: [], rowCount: 0 };
        frameworks.add(code);
        return { rows: [{ n: '1' }], rowCount: 1 };
      }
      // INSERT requirement
      if (s.startsWith('INSERT INTO') && s.includes('.requirements') && s.includes('ON CONFLICT')) {
        const k = `${p[0]}::${p[1]}`;
        if (requirements.has(k)) return { rows: [], rowCount: 0 };
        requirements.add(k);
        return { rows: [{ n: '1' }], rowCount: 1 };
      }
      // INSERT instrument node
      if (s.startsWith('INSERT INTO') && s.includes('.instrument_structure')) {
        const k = `${p[0]}::${p[1] ?? ''}::${p[4]}::${p[6]}`;
        if (nodes.has(k)) return { rows: [], rowCount: 0 };
        nodes.add(k);
        return { rows: [{ n: '1' }], rowCount: 1 };
      }
      // INSERT import row
      if (s.startsWith('INSERT INTO') && s.includes('content_pack_imports')) {
        const [pack_code, version, content_hash, ...rest] = p;
        const row = {
          import_id: `imp-${++id}`, pack_code, version, content_hash,
          status: s.includes("'noop'") ? 'noop' : 'success',
          inserted_frameworks: s.includes("'noop'") ? '0' : String(rest[0]),
          inserted_requirements: s.includes("'noop'") ? '0' : String(rest[1]),
          inserted_instrument_nodes: s.includes("'noop'") ? '0' : String(rest[2]),
          error_message: null,
          imported_at: new Date().toISOString(),
          imported_by: s.includes("'noop'") ? rest[0] : rest[3],
        };
        imports.push(row);
        return { rows: [row], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

function buildApp({ hasPermission } = {}) {
  const app = express(); app.use(express.json());
  registerCompliance({
    app,
    contentPackLoaderDeps: {
      client: makeClient(),
      resolveContext: () => ({
        tenantId: 't1', userId: 'u1', tenantSchema: 'tenant_t1', hasPermission,
      }),
    },
  });
  return { app };
}

test('hashPack is deterministic', () => {
  const p1 = { packCode: 'X', version: '1', frameworks: [{ code: 'A', title: 'A' }] };
  const p2 = { packCode: 'X', version: '1', frameworks: [{ code: 'A', title: 'A' }] };
  assert.equal(hashPack(p1), hashPack(p2));
});

test('GET empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/content-pack-loader');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST /load inserts frameworks + requirements + instrument', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const pack = {
      packCode: 'NCA-ECC',
      version: '2.0',
      frameworks: [
        { code: 'NCA-ECC-2', title: 'NCA ECC v2', regulator: 'NCA' },
      ],
      requirements: [
        { frameworkCode: 'NCA-ECC-2', code: '1-1-1', title: 'Cybersec policy', criticality: 'high' },
        { frameworkCode: 'NCA-ECC-2', code: '1-1-2', title: 'Asset inventory' },
      ],
      instrument: [
        { instrumentCode: 'NCA-ECC-2', nodeType: 'instrument', label: 'NCA ECC', language: 'en' },
        { instrumentCode: 'NCA-ECC-2', nodeType: 'chapter', parentNodeCode: 'NCA-ECC-2', label: 'Ch1', language: 'en' },
      ],
    };
    const r = await fetchJson(port, '/api/compliance/content-pack-loader/load', 'POST', { pack });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.status, 'success');
    assert.equal(r.body.data.insertedFrameworks, 1);
    assert.equal(r.body.data.insertedRequirements, 2);
    assert.equal(r.body.data.insertedInstrumentNodes, 2);
    const a = captured.find((e) => e.action === 'content_pack.load');
    assert.equal(a.after.status, 'success');
  } finally { server.close(); }
});

test('POST /load same pack twice → second is noop', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const pack = {
      packCode: 'PDPL', version: '1.0',
      frameworks: [{ code: 'PDPL', title: 'KSA PDPL' }],
    };
    const r1 = await fetchJson(port, '/api/compliance/content-pack-loader/load', 'POST', { pack });
    assert.equal(r1.body.data.status, 'success');
    const r2 = await fetchJson(port, '/api/compliance/content-pack-loader/load', 'POST', { pack });
    assert.equal(r2.body.data.status, 'noop');
    assert.equal(r2.body.data.insertedFrameworks, 0);
  } finally { server.close(); }
});

test('POST /load uses content-hash, not version: same content+different version still triggers re-import (different hash)', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const a = { packCode: 'X', version: '1', frameworks: [{ code: 'F1', title: 'F1' }] };
    const b = { packCode: 'X', version: '2', frameworks: [{ code: 'F1', title: 'F1' }] };
    const r1 = await fetchJson(port, '/api/compliance/content-pack-loader/load', 'POST', { pack: a });
    assert.equal(r1.body.data.status, 'success');
    const r2 = await fetchJson(port, '/api/compliance/content-pack-loader/load', 'POST', { pack: b });
    // Different version → different canonical hash → another success (no noop)
    assert.equal(r2.body.data.status, 'success');
  } finally { server.close(); }
});

test('POST /load without pack → bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/content-pack-loader/load', 'POST', {});
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST /load missing packCode → bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/content-pack-loader/load', 'POST',
      { pack: { version: '1' } });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('list filter by packCode narrows', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/content-pack-loader/load', 'POST',
      { pack: { packCode: 'A', version: '1' } });
    await fetchJson(port, '/api/compliance/content-pack-loader/load', 'POST',
      { pack: { packCode: 'B', version: '1' } });
    const r = await fetchJson(port, '/api/compliance/content-pack-loader?packCode=A');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('GET /:id 404 when missing', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/content-pack-loader/imp-nope');
    assert.equal(r.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write 403', async () => {
  const { app } = buildApp({
    hasPermission: (k) => k === 'content_pack.import.read',
  });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/content-pack-loader/load', 'POST',
      { pack: { packCode: 'X', version: '1' } });
    assert.equal(r.status, 403);
  } finally { server.close(); }
});

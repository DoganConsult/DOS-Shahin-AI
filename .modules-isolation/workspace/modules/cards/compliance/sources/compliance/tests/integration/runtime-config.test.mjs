/**
 * W5 — Runtime config + view-preset router tests.
 *
 * Asserts:
 *   - GET  /runtime-config/:kind/:type returns 404 when no row, 200 with payload after PUT
 *   - PUT  is idempotent (same kind/type/version overwrites)
 *   - tenant override beats template (tenant_id NULL) for the same kind/type
 *   - GET  /views/:scopeType returns the user's own presets
 *   - PUT  /views/:scopeType/:viewKey persists payload
 *   - POST /views/:scopeType/:viewKey/share marks shared and surfaces to other users
 *   - DELETE /views/:scopeType/:viewKey removes the row
 *
 * Uses an in-memory mock DbClient that simulates compliance_module_config and
 * compliance_user_view_preferences tables. No real Postgres needed.
 *
 * Run: node --test tests/integration/runtime-config.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { registerCompliance } = require('../../dist/index.js');

function fetchJson(port, path, method = 'GET', body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host: '127.0.0.1', port, path, method,
        headers: data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {},
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try { json = raw ? JSON.parse(raw) : null; } catch {}
          resolve({ status: res.statusCode, body: json });
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function makeMockClient() {
  const cfg = []; // {id, tenant_id, kind, type, version, payload, updated_at}
  const views = []; // {id, tenant_id, user_id, view_key, scope_type, payload, is_shared, shared_with, updated_at}
  let cfgId = 0, viewId = 0;
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      // ── compliance_module_config ──
      if (s.startsWith('SELECT id, payload, updated_at, tenant_id, version FROM compliance_module_config')) {
        const [kind, type, tenantId] = p;
        const matches = cfg
          .filter((r) => r.kind === kind && r.type === type && (r.tenant_id === tenantId || (tenantId !== null && r.tenant_id === null) || (tenantId === null && r.tenant_id === null)))
          .sort((a, b) => (b.tenant_id ? 1 : 0) - (a.tenant_id ? 1 : 0) || b.version - a.version);
        return { rows: matches.slice(0, 1), rowCount: Math.min(matches.length, 1) };
      }
      if (s.startsWith('INSERT INTO compliance_module_config')) {
        const [tenant_id, kind, type, version, payloadStr, updated_by] = p;
        const payload = JSON.parse(payloadStr);
        const existing = cfg.find((r) => r.tenant_id === tenant_id && r.kind === kind && r.type === type && r.version === version);
        if (existing) { existing.payload = payload; existing.updated_at = new Date().toISOString(); existing.updated_by = updated_by; }
        else cfg.push({ id: ++cfgId, tenant_id, kind, type, version, payload, updated_by, updated_at: new Date().toISOString() });
        return { rows: [], rowCount: 1 };
      }
      // ── compliance_user_view_preferences ──
      if (s.startsWith('SELECT view_key, payload, is_shared, updated_at FROM compliance_user_view_preferences')) {
        const [tenant_id, scope_type, user_id] = p;
        const rows = views
          .filter((v) => v.tenant_id === tenant_id && v.scope_type === scope_type)
          .filter((v) => v.user_id === user_id || (v.is_shared === true && (!v.shared_with || v.shared_with.includes(user_id))));
        return { rows, rowCount: rows.length };
      }
      if (s.startsWith('INSERT INTO compliance_user_view_preferences')) {
        const isShare = /is_shared, shared_with/.test(s);
        const [tenant_id, user_id, view_key, scope_type, payloadStr, sharedFlag, sharedWithArr] = p;
        const payload = JSON.parse(payloadStr);
        const found = views.find((v) => v.tenant_id === tenant_id && v.user_id === user_id && v.scope_type === scope_type && v.view_key === view_key);
        if (found) {
          found.payload = payload;
          found.updated_at = new Date().toISOString();
          if (isShare) { found.is_shared = true; found.shared_with = sharedWithArr ?? null; }
        } else {
          views.push({
            id: ++viewId, tenant_id, user_id, view_key, scope_type, payload,
            is_shared: isShare ? true : false,
            shared_with: isShare ? (sharedWithArr ?? null) : null,
            updated_at: new Date().toISOString(),
          });
        }
        return { rows: [], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM compliance_user_view_preferences')) {
        const [tenant_id, user_id, scope_type, view_key] = p;
        const before = views.length;
        for (let i = views.length - 1; i >= 0; i--) {
          const v = views[i];
          if (v.tenant_id === tenant_id && v.user_id === user_id && v.scope_type === scope_type && v.view_key === view_key) views.splice(i, 1);
        }
        return { rows: [], rowCount: before - views.length };
      }
      return { rows: [], rowCount: 0 };
    },
    _state: { cfg, views },
  };
}

function buildApp(client, ctx = { tenantId: 'tnt-1', userId: 'usr-A' }) {
  const app = express();
  app.use(express.json());
  registerCompliance({
    app,
    runtimeConfig: { client, resolveContext: () => ctx },
  });
  return app;
}

test('runtime-config GET returns 404 then 200 after PUT', async () => {
  const client = makeMockClient();
  const { server, port } = await listen(buildApp(client));
  try {
    const miss = await fetchJson(port, '/api/compliance/runtime-config/list/obligations');
    assert.equal(miss.status, 404);
    const put = await fetchJson(port, '/api/compliance/runtime-config/list/obligations', 'PUT', { payload: { columns: ['id', 'title'] } });
    assert.equal(put.status, 200);
    assert.equal(put.body.data.kind, 'list');
    assert.deepEqual(put.body.data.payload, { columns: ['id', 'title'] });
    const hit = await fetchJson(port, '/api/compliance/runtime-config/list/obligations');
    assert.equal(hit.status, 200);
    assert.equal(hit.body.data.source, 'tenant');
  } finally { server.close(); }
});

test('runtime-config rejects unknown kind with 400', async () => {
  const client = makeMockClient();
  const { server, port } = await listen(buildApp(client));
  try {
    const r = await fetchJson(port, '/api/compliance/runtime-config/bogus/x');
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_kind');
  } finally { server.close(); }
});

test('tenant override beats platform template', async () => {
  const client = makeMockClient();
  // Pre-seed a template (tenant_id NULL) directly.
  client._state.cfg.push({ id: 999, tenant_id: null, kind: 'list', type: 'controls', version: 1, payload: { tpl: true }, updated_at: new Date().toISOString() });
  const { server, port } = await listen(buildApp(client));
  try {
    const tpl = await fetchJson(port, '/api/compliance/runtime-config/list/controls');
    assert.equal(tpl.status, 200);
    assert.equal(tpl.body.data.source, 'template');
    // Now save a tenant override.
    await fetchJson(port, '/api/compliance/runtime-config/list/controls', 'PUT', { payload: { tenant: true } });
    const tnt = await fetchJson(port, '/api/compliance/runtime-config/list/controls');
    assert.equal(tnt.body.data.source, 'tenant');
    assert.deepEqual(tnt.body.data.payload, { tenant: true });
  } finally { server.close(); }
});

test('view presets: save, list, share, then peer sees shared row', async () => {
  const client = makeMockClient();
  // user A saves and shares to user B
  const appA = buildApp(client, { tenantId: 'tnt-1', userId: 'usr-A' });
  const a = await listen(appA);
  try {
    const save = await fetchJson(a.port, '/api/compliance/views/obligations/my-view', 'PUT', { payload: { sortBy: 'due' } });
    assert.equal(save.status, 200);
    const list = await fetchJson(a.port, '/api/compliance/views/obligations');
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.data[0].viewKey, 'my-view');
    const share = await fetchJson(a.port, '/api/compliance/views/obligations/my-view/share', 'POST', { payload: { sortBy: 'due' }, sharedWith: ['usr-B'] });
    assert.equal(share.status, 200);
    assert.equal(share.body.data.isShared, true);
  } finally { a.server.close(); }

  const appB = buildApp(client, { tenantId: 'tnt-1', userId: 'usr-B' });
  const b = await listen(appB);
  try {
    const list = await fetchJson(b.port, '/api/compliance/views/obligations');
    assert.equal(list.status, 200);
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.data[0].isShared, true);
  } finally { b.server.close(); }
});

test('view preset DELETE removes row, returns 404 second time', async () => {
  const client = makeMockClient();
  const { server, port } = await listen(buildApp(client));
  try {
    await fetchJson(port, '/api/compliance/views/findings/v1', 'PUT', { payload: { x: 1 } });
    const del1 = await fetchJson(port, '/api/compliance/views/findings/v1', 'DELETE');
    assert.equal(del1.status, 200);
    assert.equal(del1.body.data.deleted, true);
    const del2 = await fetchJson(port, '/api/compliance/views/findings/v1', 'DELETE');
    assert.equal(del2.status, 404);
    assert.equal(del2.body.data.deleted, false);
  } finally { server.close(); }
});

test('runtime-config router is mounted under /api/compliance and shows wired=true', async () => {
  const client = makeMockClient();
  const app = express(); app.use(express.json());
  const result = registerCompliance({ app, runtimeConfig: { client, resolveContext: () => ({ tenantId: 't', userId: 'u' }) } });
  const mount = result.mounts.find((m) => m.routeBase === '/api/compliance');
  assert.equal(mount.wired, true);
});

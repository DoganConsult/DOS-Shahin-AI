/**
 * W26 — /api/compliance/settings vertical wiring tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { registerCompliance, bindAuditPort } = require('../../dist/index.js');

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
  const rows = [];
  let id = 0;
  const matchFilters = (s, p) => {
    let i = 1;
    let out = rows.filter((r) => r.tenant_id === p[0]);
    if (s.includes('AND scope =')) { out = out.filter((r) => r.scope === p[i]); i++; }
    if (s.includes('AND is_active =')) { out = out.filter((r) => r.is_active === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, tenant_id, config_key, config_value')) {
        if (s.includes('WHERE tenant_id = $1 AND id = $2')) {
          const m = rows.find((r) => r.tenant_id === p[0] && r.id === p[1]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        if (s.includes('WHERE tenant_id = $1 AND config_key = $2')) {
          const m = rows.find((r) => r.tenant_id === p[0] && r.config_key === p[1]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        return { rows: matchFilters(s, p), rowCount: matchFilters(s, p).length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('compliance_settings')) {
        const [tenant_id, config_key, configValueJson, scope, is_active] = p;
        const existing = rows.find((r) => r.tenant_id === tenant_id && r.config_key === config_key);
        if (existing) {
          existing.config_value = JSON.parse(configValueJson);
          existing.scope = scope;
          existing.is_active = is_active;
          existing.updated_at = new Date().toISOString();
          return { rows: [existing], rowCount: 1 };
        }
        const now = new Date().toISOString();
        const row = {
          id: `set-${++id}`, tenant_id, config_key,
          config_value: JSON.parse(configValueJson),
          scope, is_active,
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('compliance_settings')) {
        const [tenant_id, id_] = p;
        const r = rows.find((x) => x.tenant_id === tenant_id && x.id === id_);
        if (!r) return { rows: [], rowCount: 0 };
        r.is_active = false;
        r.updated_at = new Date().toISOString();
        return { rows: [r], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    _rows: rows,
  };
}

function buildApp({ ctx, hasPermission } = {}) {
  const app = express(); app.use(express.json());
  const client = makeClient();
  registerCompliance({
    app,
    settingsDeps: {
      client,
      resolveContext: () => ({
        tenantId: ctx?.tenantId ?? 't1',
        userId: ctx?.userId ?? 'u1',
        tenantSchema: ctx?.tenantSchema ?? 'tenant_t1',
        hasPermission,
      }),
    },
  });
  return { app, client };
}

test('GET /api/compliance/settings empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/settings');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('PUT creates new setting (201) then upserts existing (200)', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/settings', 'PUT',
      { configKey: 'workflow.autoApprove', configValue: { enabled: true, threshold: 5 } });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.configKey, 'workflow.autoApprove');
    assert.equal(c.body.data.configValue.enabled, true);
    const u = await fetchJson(port, '/api/compliance/settings', 'PUT',
      { configKey: 'workflow.autoApprove', configValue: { enabled: false, threshold: 10 } });
    assert.equal(u.status, 200);
    assert.equal(u.body.data.configValue.enabled, false);
    assert.ok(captured.find((e) => e.action === 'setting.create'));
    assert.ok(captured.find((e) => e.action === 'setting.update'));
  } finally { server.close(); }
});

test('PUT without configKey → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/settings', 'PUT',
      { configValue: { x: 1 } });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('PUT with bad scope → 400 bad_scope', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/settings', 'PUT',
      { configKey: 'k', configValue: {}, scope: 'galaxy' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_scope');
  } finally { server.close(); }
});

test('GET /settings/by-key/:key resolves setting; 404 when missing', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/settings', 'PUT',
      { configKey: 'theme', configValue: { mode: 'dark' } });
    const ok = await fetchJson(port, '/api/compliance/settings/by-key/theme');
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.configValue.mode, 'dark');
    const miss = await fetchJson(port, '/api/compliance/settings/by-key/missing');
    assert.equal(miss.status, 404);
  } finally { server.close(); }
});

test('list filters: scope + isActive narrow result set', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/settings', 'PUT',
      { configKey: 'a', configValue: {}, scope: 'tenant', isActive: true });
    await fetchJson(port, '/api/compliance/settings', 'PUT',
      { configKey: 'b', configValue: {}, scope: 'tenant', isActive: false });
    await fetchJson(port, '/api/compliance/settings', 'PUT',
      { configKey: 'c', configValue: {}, scope: 'org', isActive: true });
    const tn = await fetchJson(port, '/api/compliance/settings?scope=tenant');
    assert.equal(tn.body.meta.total, 2);
    const act = await fetchJson(port, '/api/compliance/settings?isActive=true');
    assert.equal(act.body.meta.total, 2);
    const both = await fetchJson(port, '/api/compliance/settings?scope=tenant&isActive=true');
    assert.equal(both.body.meta.total, 1);
  } finally { server.close(); }
});

test('DELETE /settings/:id deactivates and writes audit before/after', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/settings', 'PUT',
      { configKey: 'k', configValue: { v: 1 } });
    const id = c.body.data.id;
    const d = await fetchJson(port, `/api/compliance/settings/${id}`, 'DELETE');
    assert.equal(d.status, 200);
    assert.equal(d.body.data.isActive, false);
    const a = captured.find((e) => e.action === 'setting.deactivate');
    assert.ok(a);
    assert.equal(a.before.isActive, true);
    assert.equal(a.after.isActive, false);
    const miss = await fetchJson(port, '/api/compliance/settings/missing', 'DELETE');
    assert.equal(miss.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write without setting.config.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'setting.config.read' });
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/settings');
    assert.equal(ok.status, 200);
    const put = await fetchJson(port, '/api/compliance/settings', 'PUT',
      { configKey: 'k', configValue: {} });
    assert.equal(put.status, 403);
    assert.match(put.body.error.message, /setting\.config\.write/);
  } finally { server.close(); }
});

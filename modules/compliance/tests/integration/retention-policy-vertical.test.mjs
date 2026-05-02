/**
 * W68 — /api/compliance/retention-policy vertical wiring tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const {
  registerCompliance, isSupportedEntityType, RETENTION_SUPPORTED_ENTITIES,
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

function makeClient({ rules = [], counts = {}, errorOn = null } = {}) {
  const runs = [];
  let runId = 0;
  const archived = {}; const deleted = {};
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT policy_id, entity_type, retain_days')) {
        return { rows: rules.filter((r) => r.enabled), rowCount: rules.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && !s.includes('retention_runs')) {
        const m = s.match(/"tenant_t1"\."(\w+)"/);
        const table = m ? m[1] : '';
        if (errorOn === table) throw new Error(`scan blew up on ${table}`);
        return { rows: [{ n: String(counts[table] ?? 0) }], rowCount: 1 };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('retention_runs')) {
        let out = runs.slice(); let i = 0;
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM')) {
        const m = s.match(/"tenant_t1"\."(\w+)"/);
        const table = m ? m[1] : '';
        const n = counts[table] ?? 0;
        deleted[table] = (deleted[table] ?? 0) + n;
        counts[table] = 0;
        return { rows: [], rowCount: n };
      }
      if (s.startsWith('UPDATE') && s.includes("status = 'retention_archived'")) {
        const m = s.match(/"tenant_t1"\."(\w+)"/);
        const table = m ? m[1] : '';
        const n = counts[table] ?? 0;
        archived[table] = (archived[table] ?? 0) + n;
        counts[table] = 0;
        return { rows: [], rowCount: n };
      }
      if (s.startsWith('INSERT INTO') && s.includes('retention_runs')) {
        const row = {
          run_id: `rr-${++runId}`, started_at: new Date(Date.now() + runId).toISOString(),
          finished_at: null, status: 'partial',
          total_scanned: '0', total_purged: '0', total_archived: '0',
          details: [], triggered_by: p[0],
        };
        runs.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('retention_runs')) {
        const r = runs.find((x) => x.run_id === p[0]);
        if (!r) return { rows: [], rowCount: 0 };
        r.status = p[1]; r.total_scanned = String(p[2]);
        r.total_purged = String(p[3]); r.total_archived = String(p[4]);
        r.details = typeof p[5] === 'string' ? JSON.parse(p[5]) : p[5];
        r.finished_at = new Date().toISOString();
        return { rows: [r], rowCount: 1 };
      }
      if (s.startsWith('SELECT run_id')) {
        let out = runs.slice(); let i = 0;
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        out = out.slice().sort((a, b) => b.started_at.localeCompare(a.started_at));
        return { rows: out, rowCount: out.length };
      }
      return { rows: [], rowCount: 0 };
    },
    _runs: runs, _archived: archived, _deleted: deleted,
  };
}

function buildApp({ rules, counts, hasPermission, errorOn } = {}) {
  const app = express(); app.use(express.json());
  const client = makeClient({ rules, counts, errorOn });
  registerCompliance({
    app,
    retentionPolicyDeps: {
      client,
      resolveContext: () => ({
        tenantId: 't1', userId: 'u1', tenantSchema: 'tenant_t1', hasPermission,
      }),
    },
  });
  return { app, client };
}

test('isSupportedEntityType + RETENTION_SUPPORTED_ENTITIES', () => {
  assert.equal(isSupportedEntityType('audit_events'), true);
  assert.equal(isSupportedEntityType('foo_bar'), false);
  assert.ok(RETENTION_SUPPORTED_ENTITIES.includes('evidence_files'));
});

test('GET requires permission retention.read', async () => {
  const { app } = buildApp({ hasPermission: () => false });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/retention-policy');
  server.close();
  assert.equal(r.status, 403);
});

test('POST /run requires permission retention.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'retention.read' });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/retention-policy/run', 'POST', {});
  server.close();
  assert.equal(r.status, 403);
});

test('POST /run with no rules → completed status, zero counts', async () => {
  const { app } = buildApp({ rules: [], counts: {}, hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/retention-policy/run', 'POST', {});
  server.close();
  assert.equal(r.status, 201);
  assert.equal(r.body.data.status, 'completed');
  assert.equal(r.body.data.totalScanned, 0);
});

test('POST /run hard delete reduces table count', async () => {
  const { app, client } = buildApp({
    rules: [{ policy_id: 'p1', entity_type: 'audit_events', retain_days: 30, hard_delete: true, enabled: true }],
    counts: { audit_events: 5 },
    hasPermission: () => true,
  });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/retention-policy/run', 'POST', {});
  server.close();
  assert.equal(r.body.data.status, 'completed');
  assert.equal(r.body.data.totalScanned, 5);
  assert.equal(r.body.data.totalPurged, 5);
  assert.equal(r.body.data.totalArchived, 0);
  assert.equal(client._deleted.audit_events, 5);
});

test('POST /run soft mode archives instead of deletes', async () => {
  const { app, client } = buildApp({
    rules: [{ policy_id: 'p2', entity_type: 'evidence_files', retain_days: 90, hard_delete: false, enabled: true }],
    counts: { evidence_files: 3 },
    hasPermission: () => true,
  });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/retention-policy/run', 'POST', {});
  server.close();
  assert.equal(r.body.data.totalArchived, 3);
  assert.equal(r.body.data.totalPurged, 0);
  assert.equal(client._archived.evidence_files, 3);
});

test('POST /run dryRun=true scans but does not write', async () => {
  const { app, client } = buildApp({
    rules: [{ policy_id: 'p1', entity_type: 'audit_events', retain_days: 30, hard_delete: true, enabled: true }],
    counts: { audit_events: 4 },
    hasPermission: () => true,
  });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/retention-policy/run', 'POST', { dryRun: true });
  server.close();
  assert.equal(r.body.data.totalScanned, 4);
  assert.equal(r.body.data.totalPurged, 0);
  assert.equal(client._deleted.audit_events ?? 0, 0);
});

test('POST /run skips unsupported entity type with reason', async () => {
  const { app } = buildApp({
    rules: [{ policy_id: 'p9', entity_type: 'mystery_table', retain_days: 30, hard_delete: false, enabled: true }],
    counts: {},
    hasPermission: () => true,
  });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/retention-policy/run', 'POST', {});
  server.close();
  assert.equal(r.body.data.details[0].skipped, true);
  assert.match(r.body.data.details[0].reason, /unsupported entity_type/);
});

test('POST /run skips when retain_days <= 0', async () => {
  const { app } = buildApp({
    rules: [{ policy_id: 'p3', entity_type: 'change_log', retain_days: 0, hard_delete: false, enabled: true }],
    counts: {},
    hasPermission: () => true,
  });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/retention-policy/run', 'POST', {});
  server.close();
  assert.equal(r.body.data.details[0].skipped, true);
  assert.match(r.body.data.details[0].reason, /retain_days 0/);
});

test('POST /run entityTypes filter restricts to subset', async () => {
  const { app } = buildApp({
    rules: [
      { policy_id: 'p1', entity_type: 'audit_events', retain_days: 30, hard_delete: true, enabled: true },
      { policy_id: 'p2', entity_type: 'evidence_files', retain_days: 90, hard_delete: false, enabled: true },
    ],
    counts: { audit_events: 2, evidence_files: 5 },
    hasPermission: () => true,
  });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/retention-policy/run', 'POST', {
    entityTypes: ['evidence_files'],
  });
  server.close();
  assert.equal(r.body.data.totalArchived, 5);
  assert.equal(r.body.data.totalPurged, 0);
  assert.equal(r.body.data.details.length, 1);
});

test('POST /run partial when some scans fail', async () => {
  const { app } = buildApp({
    rules: [
      { policy_id: 'p1', entity_type: 'audit_events', retain_days: 30, hard_delete: true, enabled: true },
      { policy_id: 'p2', entity_type: 'evidence_files', retain_days: 90, hard_delete: false, enabled: true },
    ],
    counts: { audit_events: 2 },
    errorOn: 'evidence_files',
    hasPermission: () => true,
  });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/retention-policy/run', 'POST', {});
  server.close();
  assert.equal(r.body.data.status, 'partial');
  assert.equal(r.body.data.totalPurged, 2);
  const failed = r.body.data.details.find((d) => d.entityType === 'evidence_files');
  assert.match(failed.reason, /error: scan blew up/);
});

test('GET list returns runs DESC and filters by status', async () => {
  const { app } = buildApp({ rules: [], counts: {}, hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/retention-policy/run', 'POST', {});
  await fetchJson(port, '/api/compliance/retention-policy/run', 'POST', {});
  const all = await fetchJson(port, '/api/compliance/retention-policy');
  const completed = await fetchJson(port, '/api/compliance/retention-policy?status=completed');
  const failed = await fetchJson(port, '/api/compliance/retention-policy?status=failed');
  server.close();
  assert.equal(all.body.meta.total, 2);
  assert.equal(completed.body.meta.total, 2);
  assert.equal(failed.body.meta.total, 0);
});

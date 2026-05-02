/**
 * W72 — /api/compliance/schema-migration-tracker vertical wiring tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { registerCompliance, MIGRATION_STATUSES } = require('../../dist/index.js');

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
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT migration_id') && s.includes('WHERE migration_id = $1')) {
        const m = rows.find((r) => r.migration_id === p[0]);
        return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      if (s.startsWith('SELECT migration_id') && s.includes('WHERE 1=1')) {
        let out = rows.slice(); let i = 0;
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        if (s.includes('AND version >')) { out = out.filter((r) => Number(r.version) > Number(p[i])); i++; }
        out = out.slice().sort((a, b) => Number(b.version) - Number(a.version));
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('schema_migrations')) {
        let out = rows.slice(); let i = 0;
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        if (s.includes('AND version >')) { out = out.filter((r) => Number(r.version) > Number(p[i])); i++; }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('SELECT MAX(version)') && s.includes('schema_migrations')) {
        const applied = rows.filter((r) => r.status === 'applied');
        const max = applied.reduce((m, r) => Math.max(m, Number(r.version)), 0);
        return { rows: [{ v: max || null }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('schema_migrations')) {
        const row = {
          migration_id: p[0], version: p[1], checksum: p[2],
          status: p[3], applied_at: new Date().toISOString(),
          applied_by: p[4], duration_ms: p[5], error: p[6],
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('schema_migrations')) {
        const r = rows.find((x) => x.migration_id === p[0]);
        if (!r) return { rows: [], rowCount: 0 };
        r.status = 'rolled_back';
        return { rows: [r], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    _rows: rows,
  };
}

function buildApp({ hasPermission } = {}) {
  const app = express(); app.use(express.json());
  const client = makeClient();
  registerCompliance({
    app,
    schemaMigrationTrackerDeps: {
      client,
      resolveContext: () => ({
        tenantId: 't1', userId: 'u1', tenantSchema: 'tenant_t1', hasPermission,
      }),
    },
  });
  return { app, client };
}

test('MIGRATION_STATUSES exposed', () => {
  assert.deepEqual(MIGRATION_STATUSES.slice().sort(), ['applied', 'failed', 'rolled_back']);
});

test('GET requires schema.migration.read', async () => {
  const { app } = buildApp({ hasPermission: () => false });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/schema-migration-tracker');
  server.close();
  assert.equal(r.status, 403);
});

test('POST requires schema.migration.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'schema.migration.read' });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/schema-migration-tracker', 'POST', {
    migrationId: 'm1', version: 1, checksum: 'c',
  });
  server.close();
  assert.equal(r.status, 403);
});

test('POST missing checksum → 400 bad_input', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/schema-migration-tracker', 'POST', {
    migrationId: 'm1', version: 1, checksum: '',
  });
  server.close();
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'bad_input');
});

test('POST records new migration applied', async () => {
  const { app, client } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/schema-migration-tracker', 'POST', {
    migrationId: 'm1', version: 1, checksum: 'sha-aaa',
  });
  server.close();
  assert.equal(r.status, 201);
  assert.equal(r.body.data.status, 'applied');
  assert.equal(r.body.data.version, 1);
  assert.equal(client._rows.length, 1);
});

test('POST same migrationId+checksum is idempotent', async () => {
  const { app, client } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/schema-migration-tracker', 'POST', {
    migrationId: 'm1', version: 1, checksum: 'sha-aaa',
  });
  const r2 = await fetchJson(port, '/api/compliance/schema-migration-tracker', 'POST', {
    migrationId: 'm1', version: 1, checksum: 'sha-aaa',
  });
  server.close();
  assert.equal(r2.status, 201);
  assert.equal(client._rows.length, 1);
});

test('POST same migrationId different checksum → 409 bad_checksum', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/schema-migration-tracker', 'POST', {
    migrationId: 'm1', version: 1, checksum: 'sha-aaa',
  });
  const r2 = await fetchJson(port, '/api/compliance/schema-migration-tracker', 'POST', {
    migrationId: 'm1', version: 1, checksum: 'sha-bbb',
  });
  server.close();
  assert.equal(r2.status, 409);
  assert.equal(r2.body.error.code, 'bad_checksum');
});

test('GET /:id returns the migration', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/schema-migration-tracker', 'POST', {
    migrationId: 'm1', version: 1, checksum: 'sha-aaa',
  });
  const r = await fetchJson(port, '/api/compliance/schema-migration-tracker/m1');
  server.close();
  assert.equal(r.status, 200);
  assert.equal(r.body.data.migrationId, 'm1');
});

test('POST /:id/rollback marks rolled_back', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/schema-migration-tracker', 'POST', {
    migrationId: 'm1', version: 1, checksum: 'sha-aaa',
  });
  const r = await fetchJson(port, '/api/compliance/schema-migration-tracker/m1/rollback', 'POST', {});
  server.close();
  assert.equal(r.body.data.status, 'rolled_back');
});

test('POST /:id/rollback unknown → 404 not_found', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/schema-migration-tracker/nope/rollback', 'POST', {});
  server.close();
  assert.equal(r.status, 404);
});

test('GET list returns latestVersion + sinceVersion filter works', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/schema-migration-tracker', 'POST', {
    migrationId: 'm1', version: 1, checksum: 'sha-1',
  });
  await fetchJson(port, '/api/compliance/schema-migration-tracker', 'POST', {
    migrationId: 'm2', version: 2, checksum: 'sha-2',
  });
  await fetchJson(port, '/api/compliance/schema-migration-tracker', 'POST', {
    migrationId: 'm3', version: 3, checksum: 'sha-3',
  });
  const all = await fetchJson(port, '/api/compliance/schema-migration-tracker');
  const since1 = await fetchJson(port, '/api/compliance/schema-migration-tracker?sinceVersion=1');
  server.close();
  assert.equal(all.body.meta.total, 3);
  assert.equal(all.body.meta.latestVersion, 3);
  assert.equal(since1.body.meta.total, 2);
});

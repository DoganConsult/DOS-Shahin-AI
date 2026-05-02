/**
 * Compliance aggregator mount surface integration test.
 *
 * Asserts:
 *   - registerCompliance() mounts every routeBase declared in manifest
 *   - each unwired routeBase responds 501 (not 404)
 *   - the introspection endpoint /__compliance/mounts returns the mount table
 *   - host-supplied routers override the placeholder for that prefix
 *
 * Uses node:test + native http to avoid adding test deps to the module.
 * Run: node --test tests/integration/aggregator-mounts.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { registerCompliance } = require('../../dist/bootstrap.js');
const manifest = require('../../module.manifest.json');

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

function fetchJson(port, path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path, method },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try { json = body ? JSON.parse(body) : null; } catch { /* non-json */ }
          resolve({ status: res.statusCode, body: json, raw: body });
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

test('aggregator mounts every routeBase from manifest', async () => {
  const app = express();
  const result = registerCompliance({ app });
  const declared = manifest.routeBases.filter((b, i, a) => a.indexOf(b) === i);
  assert.equal(result.mounts.length, declared.length);
  for (const base of declared) {
    assert.ok(result.mounts.find((m) => m.routeBase === base), `missing mount for ${base}`);
  }
});

test('unwired routeBases respond 501 (not 404) at runtime', async () => {
  const app = express();
  registerCompliance({ app });
  const { server, port } = await listen(app);
  try {
    const sample = ['/api/controls', '/api/ucf', '/api/frameworks'];
    for (const base of sample) {
      const r = await fetchJson(port, `${base}/anything`);
      assert.equal(r.status, 501, `${base} expected 501, got ${r.status}`);
      assert.equal(r.body?.status, 'not_implemented');
      assert.equal(r.body?.module, 'compliance');
      assert.equal(r.body?.routeBase, base);
    }
  } finally {
    server.close();
  }
});

test('introspection endpoint /__compliance/mounts lists wired flags', async () => {
  const app = express();
  registerCompliance({ app });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/__compliance/mounts');
    assert.equal(r.status, 200);
    assert.equal(r.body?.module, 'compliance');
    assert.ok(Array.isArray(r.body?.mounts));
    assert.equal(r.body.mounts.length, manifest.routeBases.filter((b, i, a) => a.indexOf(b) === i).length);
    // /api/compliance is always wired by the bootstrap composite. After
    // 2026-05-02 Wave 1, additional routers are wired by default in
    // bootstrap.ts (no host-supplied deps required) — they need to count as
    // wired here too.
    // Mirrors the unconditional `routers[...]` writes in bootstrap.ts.
    // `/api/controls` is NOT here because it's only wired when host passes
    // `controlsDeps`. `/api/lifecycle` is NOT here because the controlLifecycle
    // router has unresolved transitive deps (see HONEST-AUDIT-2026-05-02 §B.12).
    const DEFAULT_WIRED = new Set([
      '/api/compliance',
      '/api/objects',
      '/api/documents',
      '/api/ksa-cross-framework',
      '/api/ksa-regulatory-changes',
      '/api/ksa-sector-maturity',
      '/api/regulator/heatmap',
      '/api/regulator/portal',
      '/api/regulator/registry',
    ]);
    for (const m of r.body.mounts) {
      const expected = DEFAULT_WIRED.has(m.routeBase);
      assert.equal(m.wired, expected, `${m.routeBase} wired=${m.wired}, expected=${expected}`);
    }
  } finally {
    server.close();
  }
});

test('host-supplied router overrides placeholder for that prefix', async () => {
  const app = express();
  const customRouter = express.Router();
  customRouter.get('/ping', (_req, res) => res.json({ ok: true, scope: 'controls' }));
  const result = registerCompliance({
    app,
    routers: { '/api/controls': customRouter },
  });
  const controlsMount = result.mounts.find((m) => m.routeBase === '/api/controls');
  assert.equal(controlsMount?.wired, true);

  const { server, port } = await listen(app);
  try {
    const wired = await fetchJson(port, '/api/controls/ping');
    assert.equal(wired.status, 200);
    assert.equal(wired.body?.ok, true);
    assert.equal(wired.body?.scope, 'controls');

    const stillPlaceholder = await fetchJson(port, '/api/ucf/foo');
    assert.equal(stillPlaceholder.status, 501);
  } finally {
    server.close();
  }
});

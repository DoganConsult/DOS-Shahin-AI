#!/usr/bin/env node
/**
 * Dump the running user-service OpenAPI spec to stdout.
 *
 * The bootstrap auto-generates the spec at /openapi.json. This script boots a
 * minimal server, fetches the spec, and prints it so CI can snapshot-diff.
 *
 * Usage: node scripts/openapi-dump.mjs > openapi.json
 *
 * Exit codes: 0 = spec written, 1 = fetch failed.
 */
import http from 'node:http';

const PORT = process.env.USER_SERVICE_OPENAPI_PORT || '3902';
process.env.USER_SERVICE_PORT = PORT;
process.env.SKIP_MIGRATIONS = '1';
process.env.LOG_LEVEL = 'error';

// Import from compiled dist — openapi-dump runs post-build only, not during source linting.
await import('../dist/server.js');

const SPEC_URL = `http://127.0.0.1:${PORT}/openapi.json`;

async function fetchSpec() {
  return new Promise((resolve, reject) => {
    const req = http.get(SPEC_URL, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`GET /openapi.json → ${res.statusCode}`));
        return;
      }
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('openapi fetch timeout')));
  });
}

// Retry until the HTTP server is up.
for (let attempt = 0; attempt < 20; attempt += 1) {
  try {
    const spec = await fetchSpec();
    process.stdout.write(spec);
    process.exit(0);
  } catch {
    await new Promise((r) => setTimeout(r, 250));
  }
}
console.error('Failed to fetch OpenAPI spec after retries');
process.exit(1);

#!/usr/bin/env node
// W3 — import platform/config-center/ops/ports.allocation.json into
// dos.ui_service_registry + dos.ui_service_registry_prefixes. Idempotent.
//
// Usage: node scripts/ui-registry-import.mjs [--dry-run]
//        DATABASE_URL=postgresql://... node scripts/ui-registry-import.mjs
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const DRY = process.argv.includes('--dry-run');
const DB = process.env.DATABASE_URL
  || 'postgresql://dos_migrator:dos_migrator_pass_2026@localhost:5432/shahin_grc';

const PORTS_JSON = path.resolve('platform/config-center/ops/ports.allocation.json');
const data = JSON.parse(fs.readFileSync(PORTS_JSON, 'utf8'));

// Map service_code → DNA module_code (best-effort; null when no DNA mapping).
const MODULE_MAP = {
  'auth-service': 'dauth',
  'tenant-service': 'tenant-management',
  'user-service': 'dauth',
  'ui-os-service': 'config-center',
  'admin-service': 'config-center',
  'platform-core-service': 'dos-platform',
  'platform-product-service': 'dos-platform',
  'dos-service': 'dos-platform',
  'dnoc-service': 'dnoc',
  'dsoc-service': 'dsoc',
  'ai-gateway-service': 'ai-platform',
  'ai-engine-service': 'ai-platform',
  'ai-governance-service': 'ai-platform',
  'ai-temporal-worker': 'ai-platform',
  'ai-temporal-worker-2': 'ai-platform',
  'mcp-gateway-service': 'ai-platform',
};

const services = data.services || {};
const rows = Object.entries(services).map(([code, s]) => ({
  service_code: code,
  display_name: code.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  module_code: MODULE_MAP[code] || null,
  port: s.port,
  gateway_prefix: s.gatewayPrefix || null,
  cwd: s.cwd,
  wave: s.wave ?? null,
  registry_status: s.excluded ? 'blocked' : 'active',
  notes: s.note || s.excludedReason || null,
  prefixes: [
    ...(s.gatewayPrefix ? [{ prefix: s.gatewayPrefix, primary: true }] : []),
    ...((s.additionalGatewayPrefixes || []).map(p => ({ prefix: p, primary: false }))),
  ],
}));

console.log(`[ui-registry-import] ${rows.length} services from ${PORTS_JSON}`);
if (DRY) {
  for (const r of rows) console.log(` - ${r.service_code.padEnd(35)} :${r.port}  ${r.gateway_prefix || '-'}  module=${r.module_code || '-'}`);
  console.log('[dry-run] no DB writes');
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: DB });
let written = 0, prefixesWritten = 0;
try {
  await pool.query('BEGIN');
  for (const r of rows) {
    await pool.query(
      `INSERT INTO dos.ui_service_registry
         (service_code, display_name, module_code, port, gateway_prefix, cwd, wave, registry_status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (service_code) DO UPDATE
         SET display_name = EXCLUDED.display_name,
             module_code = EXCLUDED.module_code,
             port = EXCLUDED.port,
             gateway_prefix = EXCLUDED.gateway_prefix,
             cwd = EXCLUDED.cwd,
             wave = EXCLUDED.wave,
             registry_status = EXCLUDED.registry_status,
             notes = EXCLUDED.notes,
             updated_at = NOW()`,
      [r.service_code, r.display_name, r.module_code, r.port, r.gateway_prefix, r.cwd, r.wave, r.registry_status, r.notes],
    );
    written++;
    await pool.query(
      `DELETE FROM dos.ui_service_registry_prefixes WHERE service_code = $1`,
      [r.service_code],
    );
    for (const p of r.prefixes) {
      await pool.query(
        `INSERT INTO dos.ui_service_registry_prefixes (service_code, prefix, is_primary)
         VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [r.service_code, p.prefix, p.primary],
      );
      prefixesWritten++;
    }
  }
  await pool.query('COMMIT');
  console.log(`[ui-registry-import] wrote ${written} services, ${prefixesWritten} prefixes`);
} catch (e) {
  await pool.query('ROLLBACK');
  console.error('[ui-registry-import] FAILED', e);
  process.exit(1);
} finally {
  await pool.end();
}

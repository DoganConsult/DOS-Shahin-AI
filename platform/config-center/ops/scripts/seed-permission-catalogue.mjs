#!/usr/bin/env node
/**
 * seed-permission-catalogue.mjs — Phase 3 seed companion to
 * platform/dynamic-ui/db/public/migrations/009_dynamic_ui_drift_constraints.sql
 *
 * Reads ops/scripts/seed-data/canonical-permissions.ts and upserts every
 * entry into dos.permission_catalogue with source='canonical'. Idempotent.
 *
 *   pnpm dynamic-ui:seed-perm-catalogue
 *
 * The 009 migration's self-heal pass already inserts whatever permission
 * strings are referenced from dos.dynamic_ui_routes / _widgets at apply
 * time. This seeder is what makes the catalogue exhaustive (so future
 * dynamic-ui seeds can reference any canonical permission code without
 * needing a separate self-heal pass).
 *
 * Requires DATABASE_URL (loaded from platform/config-center/env/.env.shared if present).
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
process.chdir(repoRoot);

const CANONICAL_PERMS_FILE = 'ops/scripts/seed-data/canonical-permissions.ts';
const SHARED_ENV = 'platform/config-center/env/.env.shared';

function loadSharedEnv() {
  if (process.env.DATABASE_URL) return;
  if (!existsSync(SHARED_ENV)) return;
  const raw = readFileSync(SHARED_ENV, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const noExport = t.startsWith('export ') ? t.slice(7).trim() : t;
    const idx = noExport.indexOf('=');
    if (idx <= 0) continue;
    const key = noExport.slice(0, idx).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key] !== undefined) continue;
    process.env[key] = noExport.slice(idx + 1);
  }
}
loadSharedEnv();

if (!process.env.DATABASE_URL) {
  console.error('[seed-perm-catalogue] DATABASE_URL not set.');
  process.exit(1);
}

function extractPerms(src) {
  // Capture each { code, ..., module, resource, action } object literal.
  const re =
    /\{\s*code:\s*['"]([^'"]+)['"][^}]*?module:\s*['"]([^'"]*)['"][^}]*?resource:\s*['"]([^'"]*)['"][^}]*?action:\s*['"]([^'"]*)['"]/g;
  const out = [];
  let m; while ((m = re.exec(src))) out.push({ code: m[1], module: m[2], resource: m[3], action: m[4] });
  return out;
}

const perms = extractPerms(readFileSync(CANONICAL_PERMS_FILE, 'utf8'));
console.log(`[seed-perm-catalogue] parsed ${perms.length} canonical permissions`);

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('BEGIN');
  let inserted = 0; let updated = 0;
  for (const p of perms) {
    const r = await client.query(
      `INSERT INTO dos.permission_catalogue (code, module, resource, action, source)
       VALUES ($1, $2, $3, $4, 'canonical')
       ON CONFLICT (code) DO UPDATE SET
         module = EXCLUDED.module,
         resource = EXCLUDED.resource,
         action = EXCLUDED.action,
         source = 'canonical'
       RETURNING (xmax = 0) AS inserted`,
      [p.code, p.module, p.resource, p.action],
    );
    if (r.rows[0].inserted) inserted++; else updated++;
  }
  await client.query('COMMIT');
  console.log(`[seed-perm-catalogue] inserted=${inserted} updated=${updated} (total=${perms.length})`);
} catch (e) {
  await client.query('ROLLBACK');
  console.error('[seed-perm-catalogue] failed:', e.message);
  process.exit(1);
} finally {
  await client.end();
}

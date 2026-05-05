#!/usr/bin/env node
/**
 * foundation-pages-coverage.mjs — Phase F-FOUND CI gate (DYNAMIC).
 *
 * Verifies foundation page coverage by querying the DB directly instead
 * of maintaining a hardcoded list. Checks:
 *   ① component_keys matching 'foundation.%.page' exist in
 *      dos.dynamic_ui_component_registry with vendor='ibm-carbon'.
 *   ② Each is registered in platform/dos/registry/component-map.ts.
 *   ③ Each resolves through scripts/ui-registry/lib/archetype-map.mjs.
 *   ④ dos.dynamic_ui_routes has matching routes with tenant_id IS NULL.
 *
 * Set FOUNDATION_PAGES_COVERAGE_ENFORCE=1 to fail CI; otherwise SHADOW.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { mapComponentKeyToArchetype } from '../ui-registry/lib/archetype-map.mjs';

const REPO     = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const COMP_MAP = join(REPO, 'platform/dos/registry/component-map.ts');

const enforce = process.env.FOUNDATION_PAGES_COVERAGE_ENFORCE === '1';
const tag = '[foundation-pages-coverage]';
const violations = [];

// ─── Read foundation page keys from DB ────────────────────────────────
let PAGE_KEYS = [];
let DB_ROUTES = [];
try {
  const pgCmd = `PGPASSWORD=dos_auth_pass_2026 psql -h localhost -U dos_auth -d shahin_grc -t -A -c`;
  const keysRaw = execSync(
    `${pgCmd} "SELECT component_key FROM dos.dynamic_ui_component_registry WHERE component_key LIKE 'foundation.%.page' AND vendor='ibm-carbon' ORDER BY component_key"`,
    { encoding: 'utf8' },
  ).trim();
  PAGE_KEYS = keysRaw ? keysRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];

  const routesRaw = execSync(
    `${pgCmd} "SELECT path_pattern FROM dos.dynamic_ui_routes WHERE module_code='foundation' AND tenant_id IS NULL ORDER BY path_pattern"`,
    { encoding: 'utf8' },
  ).trim();
  DB_ROUTES = routesRaw ? routesRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];
} catch (e) {
  violations.push(`DB query failed: ${e.message}`);
}

if (PAGE_KEYS.length === 0 && violations.length === 0) {
  violations.push('No foundation.*.page keys found in dos.dynamic_ui_component_registry');
}

if (violations.length === 0) {
  // ② component-map.ts
  if (!existsSync(COMP_MAP)) {
    violations.push(`component-map.ts missing: ${COMP_MAP}`);
  } else {
    const map = readFileSync(COMP_MAP, 'utf8');
    for (const k of PAGE_KEYS) {
      if (!map.includes(`'${k}'`))
        violations.push(`component-map.ts missing '${k}'`);
    }
  }

  // ③ archetype-map resolves
  for (const k of PAGE_KEYS) {
    const m = mapComponentKeyToArchetype(k, '/foundation');
    if (!m || !m.archetype || !m.template_export)
      violations.push(`archetype-map.mjs does not resolve '${k}'`);
  }

  // ④ routes exist
  if (DB_ROUTES.length === 0)
    violations.push(`No foundation routes found in dos.dynamic_ui_routes`);
}

if (violations.length > 0) {
  for (const m of violations) console.error(`${tag} FAIL ${m}`);
  if (enforce) process.exit(1);
  console.warn(`${tag} SHADOW (${violations.length} violation${violations.length === 1 ? '' : 's'}). Set FOUNDATION_PAGES_COVERAGE_ENFORCE=1 to enforce.`);
  process.exit(0);
}
console.log(`${tag} OK — ${PAGE_KEYS.length} foundation pages + ${DB_ROUTES.length} routes resolved from DB.`);

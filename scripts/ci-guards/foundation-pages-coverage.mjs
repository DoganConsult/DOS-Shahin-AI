#!/usr/bin/env node
/**
 * foundation-pages-coverage.mjs — Phase F-FOUND CI gate (DYNAMIC)
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/foundation-pages-coverage.mjs [OPTIONS]

Verifies foundation page coverage by querying DB directly.

Options:
  --help, -h           Show this help message

Environment Variables:
  FOUNDATION_PAGES_COVERAGE_ENFORCE  Set to 1 to fail CI (default: SHADOW mode)

Checks:
  ① dos.dynamic_ui_routes foundation entries expose component_key values (tenant_id IS NULL)
  ② Each route component_key exists in dos.dynamic_ui_component_registry (vendor='ibm-carbon')
  ③ Each route component_key is registered in platform/dos/registry/component-map.ts
  ④ Each route component_key resolves through scripts/ui-registry/lib/archetype-map.mjs

Exit codes:
  Non-zero if any check fails (when FOUNDATION_PAGES_COVERAGE_ENFORCE=1)

Examples:
  # Run in shadow mode (default)
  node scripts/ci-guards/foundation-pages-coverage.mjs

  # Run with enforcement
  FOUNDATION_PAGES_COVERAGE_ENFORCE=1 node scripts/ci-guards/foundation-pages-coverage.mjs
`);
  process.exit(0);
}

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
let REGISTRY_KEYS = [];
try {
  const pgCmd = `PGPASSWORD=dos_auth_pass_2026 psql -h localhost -U dos_auth -d shahin_grc -t -A -c`;
  const routeKeysRaw = execSync(
    `${pgCmd} "SELECT DISTINCT component_key FROM dos.dynamic_ui_routes WHERE module_code='foundation' AND tenant_id IS NULL ORDER BY component_key"`,
    { encoding: 'utf8' },
  ).trim();
  PAGE_KEYS = routeKeysRaw ? routeKeysRaw.split('\n').map((s) => s.trim()).filter(Boolean) : [];

  const registryRaw = execSync(
    `${pgCmd} "SELECT component_key FROM dos.dynamic_ui_component_registry WHERE vendor='ibm-carbon' ORDER BY component_key"`,
    { encoding: 'utf8' },
  ).trim();
  REGISTRY_KEYS = registryRaw ? registryRaw.split('\n').map((s) => s.trim()).filter(Boolean) : [];

  const routesRaw = execSync(
    `${pgCmd} "SELECT path_pattern FROM dos.dynamic_ui_routes WHERE module_code='foundation' AND tenant_id IS NULL ORDER BY path_pattern"`,
    { encoding: 'utf8' },
  ).trim();
  DB_ROUTES = routesRaw ? routesRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];
} catch (e) {
  violations.push(`DB query failed: ${e.message}`);
}

if (PAGE_KEYS.length === 0 && violations.length === 0) {
  violations.push('No foundation component keys found in dos.dynamic_ui_routes');
}

if (violations.length === 0) {
  // ② dynamic_ui_component_registry coverage for route keys
  const registrySet = new Set(REGISTRY_KEYS);
  for (const k of PAGE_KEYS) {
    if (!registrySet.has(k)) violations.push(`dynamic_ui_component_registry missing '${k}' (from foundation route set)`);
  }

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

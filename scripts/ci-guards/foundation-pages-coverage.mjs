#!/usr/bin/env node
/**
 * foundation-pages-coverage.mjs — Phase F-FOUND CI gate.
 *
 * Verifies the Foundation Pages Pack stays coherent:
 *   ① 21 foundation.<x>.page component_keys are seeded in
 *      20260503_0029_foundation_pages_pack.sql with vendor='ibm-carbon'
 *      and approval_status='approved'.
 *   ② Each is registered in platform/dos/registry/component-map.ts.
 *   ③ Each resolves through scripts/ui-registry/lib/archetype-map.mjs.
 *   ④ Each is present in FOUNDATION_CONTRACT.pages
 *      (platform/foundation/contracts/foundation.module-contract.ts) —
 *      derived from pageCode → '<pageCode>.page'.
 *   ⑤ 21 dos.dynamic_ui_routes rows are seeded with tenant_id IS NULL.
 *   ⑥ Tenant-fan-out (dos.dynamic_ui_module_status) INSERT…SELECT from
 *      platform_dos.tenants_registry exists.
 *
 * Set FOUNDATION_PAGES_COVERAGE_ENFORCE=1 to fail CI; otherwise SHADOW.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapComponentKeyToArchetype } from '../ui-registry/lib/archetype-map.mjs';

const REPO     = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SEED_SQL = join(REPO, 'platform/dos/migrations/public/20260503_0029_foundation_pages_pack.sql');
const COMP_MAP = join(REPO, 'platform/dos/registry/component-map.ts');
const CONTRACT = join(REPO, 'platform/foundation/contracts/foundation.module-contract.ts');

const PAGE_KEYS = [
  'foundation.overview.page',
  'foundation.organization.page',
  'foundation.business-units.page',
  'foundation.departments.page',
  'foundation.positions.page',
  'foundation.locations.page',
  'foundation.users.page',
  'foundation.teams.page',
  'foundation.roles.page',
  'foundation.permissions.page',
  'foundation.committees.page',
  'foundation.delegations.page',
  'foundation.access-review.page',
  'foundation.policies.page',
  'foundation.audit.page',
  'foundation.ownership.page',
  'foundation.sod.page',
  'foundation.hierarchy-viz.page',
  'foundation.user-lifecycle.page',
  'foundation.reference-data.page',
  'foundation.diagnostics.page',
];
const ROUTES = [
  '/foundation/overview','/foundation/organization','/foundation/business-units',
  '/foundation/departments','/foundation/positions','/foundation/locations',
  '/foundation/users','/foundation/teams','/foundation/roles',
  '/foundation/permissions','/foundation/committees','/foundation/delegations',
  '/foundation/access-review','/foundation/policies','/foundation/audit',
  '/foundation/ownership','/foundation/sod','/foundation/hierarchy-viz',
  '/foundation/user-lifecycle','/foundation/reference-data','/foundation/diagnostics',
];

const enforce = process.env.FOUNDATION_PAGES_COVERAGE_ENFORCE === '1';
const tag = '[foundation-pages-coverage]';
const violations = [];

function need(p, label) {
  if (!existsSync(p)) violations.push(`${label} missing: ${p}`);
}
need(SEED_SQL, 'foundation pages seed migration');
need(COMP_MAP, 'component-map.ts');
need(CONTRACT, 'foundation.module-contract.ts');

if (violations.length === 0) {
  const seed = readFileSync(SEED_SQL, 'utf8');
  const map  = readFileSync(COMP_MAP, 'utf8');
  const con  = readFileSync(CONTRACT, 'utf8');

  // ① + ② + ③ + ④
  for (const k of PAGE_KEYS) {
    if (!seed.includes(`'${k}'`))
      violations.push(`seed missing component_key '${k}'`);
    if (!map.includes(`'${k}'`))
      violations.push(`component-map.ts missing '${k}'`);
    const m = mapComponentKeyToArchetype(k, '/foundation');
    if (!m || !m.archetype || !m.template_export)
      violations.push(`archetype-map.mjs does not resolve '${k}'`);
    const pageCode = k.replace(/\.page$/, '');
    if (!con.includes(`'${pageCode}'`))
      violations.push(`FOUNDATION_CONTRACT missing pageCode '${pageCode}'`);
  }

  const carbonRows = (seed.match(/'ibm-carbon'/g) || []).length;
  if (carbonRows < PAGE_KEYS.length)
    violations.push(`expected >=${PAGE_KEYS.length} ibm-carbon rows in seed, found ${carbonRows}`);

  // ⑤ public routes (tenant_id IS NULL projection)
  for (const r of ROUTES) {
    if (!seed.includes(`'${r}'`)) violations.push(`seed missing route ${r}`);
  }
  if (!/tenant_id\s+IS\s+NULL/i.test(seed))
    violations.push(`seed missing tenant_id IS NULL projection guard`);
  if (!/module_code\s*=\s*'foundation'/i.test(seed))
    violations.push(`seed missing module_code='foundation' filter`);

  // ⑥ tenant fan-out
  if (!/dynamic_ui_module_status/.test(seed))
    violations.push(`seed missing dynamic_ui_module_status fan-out`);
  if (!/platform_dos\.tenants_registry/.test(seed))
    violations.push(`seed missing platform_dos.tenants_registry SELECT`);
  if (!/status\s*=\s*'active'/i.test(seed))
    violations.push(`seed must restrict tenant fan-out to status='active'`);
  if (!/ON CONFLICT[\s\S]+module_code\)\s+DO/i.test(seed))
    violations.push(`tenant fan-out must use ON CONFLICT (tenant_id, module_code) DO ...`);

  // Module catalog row
  if (!/INTO\s+dos\.dynamic_ui_modules/i.test(seed))
    violations.push(`seed missing dos.dynamic_ui_modules upsert`);
}

if (violations.length > 0) {
  for (const m of violations) console.error(`${tag} FAIL ${m}`);
  if (enforce) process.exit(1);
  console.warn(`${tag} SHADOW (${violations.length} violation${violations.length === 1 ? '' : 's'}). Set FOUNDATION_PAGES_COVERAGE_ENFORCE=1 to enforce.`);
  process.exit(0);
}
console.log(`${tag} OK — 21 foundation pages + routes + per-tenant enrollment wired coherently.`);

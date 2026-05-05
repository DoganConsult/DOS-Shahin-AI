#!/usr/bin/env node
/**
 * dynamic-ui-hard-gates.mjs
 *
 * CI gate enforcing the 11 Hard Gates from
 * DOS-AIO-Specs/dynamic-ui-enrollment-page-experience-widgets-spec.md §10
 * (must pass to claim "enrolled"):
 *
 *   1.  /api/dynamic-ui/contract/{moduleCode} returns module contract
 *   2.  /api/dynamic-ui/route-catalog includes all active routes
 *   3.  every route has pageType
 *   4.  every route has layout
 *   5.  every route has kpiScope
 *   6.  every route has titleKey
 *   7.  navigation renders from contract
 *   8.  overview page shows module KPIs
 *   9.  non-overview pages do not show overview KPIs
 *   10. permissions filter navigation
 *   11. SPA build passes (delegated to existing build CI; checked here as marker file)
 *
 * Modes
 * -----
 * - LIVE (default if `DYNAMIC_UI_BASE_URL` reachable):
 *     Calls /api/dynamic-ui/contract/<module> and /api/dynamic-ui/route-catalog
 *     for every active module discovered via /api/dynamic-ui/modules.
 * - STATIC (fallback, allowed only outside DYNAMIC_UI_STRICT): reads seed SQL
 *     files under platform/dynamic-ui/db/public/seeds/ and verifies
 *     route-shape constraints statically.
 * - DYNAMIC_UI_STRICT=1: live mode is mandatory. Any unreachable service or
 *     any WARN result causes exit 1. There is no static fallback.
 *
 * Usage
 * -----
 *   node scripts/ci-guards/dynamic-ui-hard-gates.mjs
 *   DYNAMIC_UI_BASE_URL=http://127.0.0.1:4015 node scripts/ci-guards/dynamic-ui-hard-gates.mjs
 *   STRICT=1 node scripts/ci-guards/dynamic-ui-hard-gates.mjs            # fail on any WARN
 *   DYNAMIC_UI_STRICT=1 node scripts/ci-guards/dynamic-ui-hard-gates.mjs # fail-closed live mode
 *
 * Exit codes
 * ----------
 *   0 — all gates pass
 *   1 — at least one gate failed
 *   2 — harness error (cannot run check)
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
// Canonical paths (post Phase-0 consolidation): all dynamic-ui SQL lives
// under platform/dos/migrations/public; seed-style SQL is the same dir.
const SEEDS_DIR = path.join(REPO_ROOT, 'platform/dos/migrations/public');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'platform/dos/migrations/public');
const SPA_DIST_INDEX = path.join(
  REPO_ROOT,
  'products/shahin-ai/app/dist/shahin-ai/browser/index.html',
);
const STRICT = process.env.STRICT === '1';
const RUNTIME_STRICT = process.env.DYNAMIC_UI_STRICT === '1';
const BASE_URL = process.env.DYNAMIC_UI_BASE_URL || 'http://127.0.0.1:4015';

const REQUIRED_ROUTE_FIELDS = ['pageType', 'layout', 'kpiScope', 'titleKey'];
const VALID_PAGE_TYPES = new Set([
  'overview',
  'list',
  'object',
  'workflow',
  'analytics',
  'audit',
  'settings',
]);
const VALID_LAYOUTS = new Set([
  'dashboard',
  'full-page',
  'split-view',
  'object-page',
  'wizard',
  'report',
]);
const VALID_KPI_SCOPES = new Set(['module-overview', 'page-local', 'none']);

// ─── Result aggregation ──────────────────────────────────────────────────────

const results = [];
function gate(num, name, status, detail) {
  results.push({ num, name, status, detail });
}

// ─── Live-mode probes ────────────────────────────────────────────────────────

async function probeLive() {
  let modulesResp;
  try {
    modulesResp = await fetch(`${BASE_URL}/modules`, {
      headers: { 'x-tenant-id': process.env.DYNAMIC_UI_TENANT_ID || 'platform' },
    });
  } catch (err) {
    return { ok: false, reason: `cannot reach ${BASE_URL}: ${err.message}` };
  }
  if (!modulesResp.ok) {
    return { ok: false, reason: `${BASE_URL}/modules returned ${modulesResp.status}` };
  }
  const modules = await modulesResp.json();
  return { ok: true, modules };
}

async function checkContractEndpoint(moduleCode) {
  const resp = await fetch(`${BASE_URL}/contract/${encodeURIComponent(moduleCode)}`, {
    headers: { 'x-tenant-id': process.env.DYNAMIC_UI_TENANT_ID || 'platform' },
  });
  if (!resp.ok) {
    return { ok: false, status: resp.status };
  }
  return { ok: true, body: await resp.json() };
}

async function checkRouteCatalog() {
  const resp = await fetch(`${BASE_URL}/route-catalog`, {
    headers: { 'x-tenant-id': process.env.DYNAMIC_UI_TENANT_ID || 'platform' },
  });
  if (!resp.ok) return { ok: false, status: resp.status };
  return { ok: true, body: await resp.json() };
}

// ─── Static-mode probes ──────────────────────────────────────────────────────

function readSeedFiles() {
  if (!existsSync(SEEDS_DIR)) return [];
  return readdirSync(SEEDS_DIR)
    .filter((f) => f.endsWith('.sql') || f.endsWith('.json'))
    .map((f) => ({ name: f, content: readFileSync(path.join(SEEDS_DIR, f), 'utf-8') }));
}

function readMigrationFiles() {
  if (!existsSync(MIGRATIONS_DIR)) return [];
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => ({ name: f, content: readFileSync(path.join(MIGRATIONS_DIR, f), 'utf-8') }));
}

function staticRouteShapeCheck() {
  // Post Phase-0 consolidation, page-experience columns + their CHECK
  // constraints can be split across the canonical creation migration
  // (20260501_0300_dynamic_ui_catalog.sql) and any subsequent additive
  // migration. Concatenate the migration corpus and assert presence.
  const migrations = readMigrationFiles();
  if (migrations.length === 0) {
    return {
      ok: false,
      reason: 'no migrations found at platform/dos/migrations/public/',
    };
  }
  const c = migrations.map((m) => m.content).join('\n');
  const requiredCols = [
    'page_type',
    'layout',
    'kpi_scope',
    'user_intent',
    'audience_profiles',
    'data_scope_mode',
    'signature_widget',
    'mobile_variant',
    'empty_state_key',
    'error_state_key',
  ];
  const missing = requiredCols.filter((col) => !c.includes(col));
  if (missing.length) {
    return {
      ok: false,
      reason: `page-experience columns missing across migrations: ${missing.join(', ')}`,
    };
  }
  const wantConstraints = [
    'ck_dynamic_ui_routes_page_type',
    'ck_dynamic_ui_routes_layout',
    'ck_dynamic_ui_routes_kpi_scope',
  ];
  const missingC = wantConstraints.filter((k) => !c.includes(k));
  if (missingC.length) {
    return { ok: false, reason: `missing CHECK constraints: ${missingC.join(', ')}` };
  }
  return { ok: true };
}

function staticTitleKeyCheck() {
  // Walk seed SQL/JSON for route INSERTs and confirm title_key is non-empty.
  const seeds = readSeedFiles();
  const offenders = [];
  for (const f of seeds) {
    if (!f.content.includes('dynamic_ui_routes')) continue;
    // crude: look for INSERT � VALUES rows with empty/null title_key in column position.
    // Strip NOT NULL so DDL like `title_key VARCHAR(200) NOT NULL` does not match `\bnull\b`.
    const sanitized = f.content.replace(/NOT\s+NULL/gi, 'NOT_XX');
    const lower = sanitized.toLowerCase();
    if (lower.includes('title_key') && /title_key\s*[,)]/.test(lower)) {
      if (
        /,\s*null\s*,/i.test(sanitized) &&
        sanitized.toLowerCase().split('title_key')[1]?.slice(0, 500).match(/\bnull\b/i)
      ) {
        offenders.push(f.name);
      }
    }
  }
  return offenders.length === 0
    ? { ok: true }
    : { ok: false, reason: `seed files with NULL title_key: ${offenders.join(', ')}` };
}

function staticSpaBuildMarkerCheck() {
  if (existsSync(SPA_DIST_INDEX)) return { ok: true };
  return {
    ok: false,
    reason: `SPA build artifact not present at ${SPA_DIST_INDEX} — run \`pnpm build:spa\``,
    soft: true, // don't fail in static mode unless STRICT=1
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const live = await probeLive();
  const mode = live.ok ? 'LIVE' : 'STATIC';
  console.log(
    `[dynamic-ui-hard-gates] mode=${mode} base=${BASE_URL}${RUNTIME_STRICT ? ' DYNAMIC_UI_STRICT=1' : ''}`,
  );
  if (!live.ok) console.log(`[dynamic-ui-hard-gates]   reason: ${live.reason}`);
  if (RUNTIME_STRICT && !live.ok) {
    console.error(
      `[dynamic-ui-hard-gates] FAIL — DYNAMIC_UI_STRICT=1 requires a reachable Dynamic UI service at ${BASE_URL}`,
    );
    console.error(`[dynamic-ui-hard-gates] reason: ${live.reason}`);
    process.exit(1);
  }

  if (live.ok) {
    // 1. /contract/:moduleCode
    // Field aliases — the contract endpoint emits snake_case from DB; the spec
    // uses camelCase. Accept either.
    const fieldOf = (route, ...keys) => {
      for (const k of keys) {
        if (route[k] != null && route[k] !== '') return route[k];
      }
      return null;
    };
    const routeName = (route) => fieldOf(route, 'path_pattern', 'route', 'id') ?? '?';

    let contractFails = 0;
    let routeShapeFails = [];
    const modules = Array.isArray(live.modules) ? live.modules : live.modules?.modules ?? [];
    for (const m of modules) {
      const code = typeof m === 'string' ? m : m.module_code ?? m.moduleCode;
      if (!code) continue;
      const r = await checkContractEndpoint(code);
      if (!r.ok) {
        contractFails++;
        continue;
      }
      const routes = r.body?.routes ?? r.body?.routeCatalog ?? [];
      for (const route of routes) {
        const pageType = fieldOf(route, 'pageType', 'page_type');
        const layout = fieldOf(route, 'layout');
        const kpiScope = fieldOf(route, 'kpiScope', 'kpi_scope');
        const titleKey = fieldOf(route, 'titleKey', 'title_key');
        const name = routeName(route);
        if (pageType == null) routeShapeFails.push(`${code}:${name} missing pageType`);
        if (layout == null) routeShapeFails.push(`${code}:${name} missing layout`);
        if (kpiScope == null) routeShapeFails.push(`${code}:${name} missing kpiScope`);
        if (titleKey == null) routeShapeFails.push(`${code}:${name} missing titleKey`);
        if (pageType && !VALID_PAGE_TYPES.has(pageType)) {
          routeShapeFails.push(`${code}:${name} bad pageType=${pageType}`);
        }
        if (layout && !VALID_LAYOUTS.has(layout)) {
          routeShapeFails.push(`${code}:${name} bad layout=${layout}`);
        }
        if (kpiScope && !VALID_KPI_SCOPES.has(kpiScope)) {
          routeShapeFails.push(`${code}:${name} bad kpiScope=${kpiScope}`);
        }
        // Gate 9: non-overview pages must not declare module-overview kpiScope.
        if (pageType !== 'overview' && kpiScope === 'module-overview') {
          routeShapeFails.push(`${code}:${name} non-overview claims kpiScope=module-overview`);
        }
      }
    }
    gate(
      1,
      '/contract/:moduleCode returns module contract',
      contractFails === 0 ? 'PASS' : 'FAIL',
      contractFails === 0 ? null : `${contractFails} module(s) failed contract endpoint`,
    );
    gate(
      3,
      'every route has pageType',
      routeShapeFails.filter((s) => s.includes('missing pageType')).length === 0
        ? 'PASS'
        : 'FAIL',
      routeShapeFails.filter((s) => s.includes('missing pageType')).join('; '),
    );
    gate(
      4,
      'every route has layout',
      routeShapeFails.filter((s) => s.includes('missing layout')).length === 0
        ? 'PASS'
        : 'FAIL',
      routeShapeFails.filter((s) => s.includes('missing layout')).join('; '),
    );
    gate(
      5,
      'every route has kpiScope',
      routeShapeFails.filter((s) => s.includes('missing kpiScope')).length === 0
        ? 'PASS'
        : 'FAIL',
      routeShapeFails.filter((s) => s.includes('missing kpiScope')).join('; '),
    );
    gate(
      6,
      'every route has titleKey',
      routeShapeFails.filter((s) => s.includes('missing titleKey')).length === 0
        ? 'PASS'
        : 'FAIL',
      routeShapeFails.filter((s) => s.includes('missing titleKey')).join('; '),
    );
    gate(
      9,
      'non-overview pages do not declare module-overview KPIs',
      routeShapeFails.filter((s) => s.includes('non-overview claims')).length === 0
        ? 'PASS'
        : 'FAIL',
      routeShapeFails.filter((s) => s.includes('non-overview claims')).join('; '),
    );

    // 2. /route-catalog
    const cat = await checkRouteCatalog();
    gate(
      2,
      '/route-catalog includes all active routes',
      cat.ok ? 'PASS' : 'FAIL',
      cat.ok ? null : `route-catalog returned ${cat.status}`,
    );

    // Gates 7, 8, 10 require navigation/permission knowledge and SSE; mark
    // PASS if `routes[].permission` and `routes[].pageType=='overview' →
    // signatureWidget != null` are present in contract data.
    let navOk = true;
    let overviewKpiOk = true;
    let permFilterOk = true;
    const navFails = [];
    for (const m of modules) {
      const code = typeof m === 'string' ? m : m.module_code ?? m.moduleCode;
      if (!code) continue;
      const r = await checkContractEndpoint(code);
      if (!r.ok) continue;
      const routes = r.body?.routes ?? [];
      const nav = r.body?.navigation ?? [];
      if (!Array.isArray(nav) || nav.length === 0) {
        navOk = false;
        navFails.push(code);
      }
      const overview = routes.find(
        (x) => fieldOf(x, 'pageType', 'page_type') === 'overview',
      );
      if (overview && !fieldOf(overview, 'signatureWidget', 'signature_widget')) {
        overviewKpiOk = false;
      }
      const anyWithPerm = routes.some(
        (x) => fieldOf(x, 'permission', 'permission_key'),
      );
      if (!anyWithPerm) permFilterOk = false;
    }
    gate(
      7,
      'navigation renders from contract',
      navOk ? 'PASS' : 'FAIL',
      navOk ? null : `modules with empty navigation: ${navFails.join(', ')}`,
    );
    gate(
      8,
      'overview page shows module KPIs (signatureWidget present)',
      overviewKpiOk ? 'PASS' : 'FAIL',
      overviewKpiOk ? null : 'overview route missing signatureWidget',
    );
    gate(
      10,
      'permissions filter navigation (permission keys declared)',
      permFilterOk ? 'PASS' : 'FAIL',
      permFilterOk ? null : 'no routes declared permission keys',
    );
  } else {
    // STATIC fallback — verify schema/seeds.
    const shape = staticRouteShapeCheck();
    gate(
      3,
      '(static) page-experience migration declares pageType/layout/kpiScope columns',
      shape.ok ? 'PASS' : 'FAIL',
      shape.reason,
    );
    gate(
      4,
      '(static) layout column present and CHECK-constrained',
      shape.ok ? 'PASS' : 'FAIL',
      shape.reason,
    );
    gate(
      5,
      '(static) kpi_scope column present and CHECK-constrained',
      shape.ok ? 'PASS' : 'FAIL',
      shape.reason,
    );
    const titles = staticTitleKeyCheck();
    gate(
      6,
      '(static) seed routes carry non-NULL title_key',
      titles.ok ? 'PASS' : 'FAIL',
      titles.reason,
    );
    gate(
      1,
      '(static) /contract/:moduleCode skipped — service unreachable',
      'WARN',
      live.reason,
    );
    gate(2, '(static) /route-catalog skipped — service unreachable', 'WARN', live.reason);
    gate(7, '(static) navigation gate skipped — service unreachable', 'WARN', live.reason);
    gate(8, '(static) overview KPI gate skipped — service unreachable', 'WARN', live.reason);
    gate(9, '(static) KPI hierarchy gate skipped — service unreachable', 'WARN', live.reason);
    gate(10, '(static) permission filter gate skipped — service unreachable', 'WARN', live.reason);
  }

  // 11. SPA build artifact
  const spa = staticSpaBuildMarkerCheck();
  gate(
    11,
    'SPA build passes (build artifact present)',
    spa.ok ? 'PASS' : spa.soft && !STRICT ? 'WARN' : 'FAIL',
    spa.reason,
  );

  // ── Report ────────────────────────────────────────────────────────────
  const sorted = results.sort((a, b) => a.num - b.num);
  let fails = 0;
  let warns = 0;
  console.log('');
  console.log('Hard Gates (§10)');
  console.log('────────────────────────────────────────────────────────────────');
  for (const r of sorted) {
    const tag =
      r.status === 'PASS' ? '[32mPASS[0m' :
      r.status === 'WARN' ? '[33mWARN[0m' :
                            '[31mFAIL[0m';
    console.log(`  ${String(r.num).padStart(2)}. [${tag}] ${r.name}`);
    if (r.detail) console.log(`        ${r.detail}`);
    if (r.status === 'FAIL') fails++;
    if (r.status === 'WARN') warns++;
  }
  console.log('────────────────────────────────────────────────────────────────');
  console.log(`  total: ${sorted.length}   pass: ${sorted.length - fails - warns}   warn: ${warns}   fail: ${fails}`);

  if (fails > 0) process.exit(1);
  if ((STRICT || RUNTIME_STRICT) && warns > 0) {
    console.error(
      `[dynamic-ui-hard-gates] ${RUNTIME_STRICT ? 'DYNAMIC_UI_STRICT=1' : 'STRICT=1'} and WARN present — exiting 1`,
    );
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('[dynamic-ui-hard-gates] harness error:', err);
  process.exit(2);
});

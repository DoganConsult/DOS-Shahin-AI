#!/usr/bin/env node
/**
 * dynamic-ui-runtime-strict.mjs
 *
 * Wave 0.5 — fail-closed runtime enforcement gate.
 *
 * Static gates (Wave 0) only prove that the schema and seeds are well-shaped;
 * they do NOT prove that the platform actually serves a dynamic contract at
 * runtime. This gate proves the contract is live and authoritative.
 *
 * Mandatory probes (each must PASS or exit 1, no WARN allowed)
 *   1.  DYNAMIC_UI_BASE_URL is set                    → otherwise exit 1
 *   2.  GET <BASE>/health                               → 200 OK
 *   3.  GET <BASE>/modules                              → non-empty list
 *   4.  GET <BASE>/contract/foundation                  → non-empty contract
 *   5.  contract.routes is non-empty                   → at least one route
 *   6.  contract.navigation is non-empty                → nav from contract
 *   7.  contract has a route with pageType=overview    → overview present
 *   8.  GET <BASE>/route-catalog                        → contains foundation routes
 *   9.  every route in catalog has pageType+layout+kpiScope+titleKey populated
 *  10.  no route in catalog references a moduleCode not in /modules
 *  11.  contract.widgets defined for at least 1 route   → widget seed present
 *  12.  page-quality-gate runs in strict mode → 0 below threshold
 *
 * Usage
 * -----
 *   DYNAMIC_UI_BASE_URL=http://127.0.0.1:4015 \
 *     node scripts/ci-guards/dynamic-ui-runtime-strict.mjs
 *
 * Exit codes: 0 / 1 / 2 (harness)
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE_URL = process.env.DYNAMIC_UI_BASE_URL;
const TENANT = process.env.DYNAMIC_UI_TENANT_ID || 'platform';
const TIMEOUT_MS = Number(process.env.DYNAMIC_UI_TIMEOUT_MS || 5000);

const REQUIRED_FIELDS = ['pageType', 'layout', 'kpiScope', 'titleKey'];
// page-quality-gate uses snake_case from DB pulls; route-catalog may emit
// either camelCase (from /contract bundle) or snake_case (from raw rows).
const SNAKE_CASE_MAP = {
  pageType: 'page_type',
  layout: 'layout',
  kpiScope: 'kpi_scope',
  titleKey: 'title_key',
};

const results = [];
function gate(num, name, status, detail) {
  results.push({ num, name, status, detail });
}

async function jsonGet(url, label) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      headers: { 'x-tenant-id': TENANT },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) return { ok: false, reason: `${label} returned ${r.status}` };
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('json')) {
      const text = await r.text();
      return { ok: false, reason: `${label} returned non-json: ${text.slice(0, 80)}` };
    }
    return { ok: true, body: await r.json() };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, reason: `${label} network error: ${err.message}` };
  }
}

function getRouteField(route, field) {
  if (route[field] != null && route[field] !== '') return route[field];
  const snake = SNAKE_CASE_MAP[field];
  if (snake && route[snake] != null && route[snake] !== '') return route[snake];
  return null;
}

function routeName(r) {
  return r.path_pattern || r.route || r.id || '?';
}

async function main() {
  console.log(
    `[dynamic-ui-runtime-strict] starting — BASE_URL=${BASE_URL || '(unset)'} TENANT=${TENANT}`,
  );

  // Gate 1 — env
  if (!BASE_URL) {
    console.error(
      '[dynamic-ui-runtime-strict] FAIL — DYNAMIC_UI_BASE_URL is mandatory in runtime-strict mode',
    );
    process.exit(1);
  }
  gate(1, 'DYNAMIC_UI_BASE_URL is set', 'PASS', BASE_URL);

  // Gate 2 — /health
  const health = await jsonGet(`${BASE_URL}/health`, '/health');
  if (!health.ok) {
    gate(2, 'GET /health → 200 OK', 'FAIL', health.reason);
    return finalize();
  }
  gate(2, 'GET /health → 200 OK', 'PASS', JSON.stringify(health.body));

  // Gate 3 — /modules
  const modules = await jsonGet(`${BASE_URL}/modules`, '/modules');
  if (!modules.ok) {
    gate(3, 'GET /modules → non-empty list', 'FAIL', modules.reason);
    return finalize();
  }
  const moduleList = Array.isArray(modules.body)
    ? modules.body
    : modules.body?.modules ?? [];
  if (!moduleList.length) {
    gate(3, 'GET /modules → non-empty list', 'FAIL', 'modules array is empty');
    return finalize();
  }
  const moduleCodes = new Set(
    moduleList.map((m) => (typeof m === 'string' ? m : m.module_code ?? m.moduleCode)).filter(Boolean),
  );
  gate(3, 'GET /modules → non-empty list', 'PASS', `${moduleCodes.size} modules`);

  // Gate 4 — /contract/foundation
  const contract = await jsonGet(`${BASE_URL}/contract/foundation`, '/contract/foundation');
  if (!contract.ok) {
    gate(4, 'GET /contract/foundation', 'FAIL', contract.reason);
    return finalize();
  }
  const c = contract.body;
  if (!c || (typeof c !== 'object')) {
    gate(4, 'GET /contract/foundation', 'FAIL', 'response is not an object');
    return finalize();
  }
  gate(4, 'GET /contract/foundation', 'PASS', `module=${c.module?.module_code ?? c.moduleCode ?? '?'}`);

  // Gate 5 — contract.routes non-empty
  const routes = c.routes ?? [];
  if (!Array.isArray(routes) || routes.length === 0) {
    gate(5, 'contract.routes non-empty', 'FAIL', 'no routes returned');
    return finalize();
  }
  gate(5, 'contract.routes non-empty', 'PASS', `${routes.length} routes`);

  // Gate 6 — contract.navigation non-empty
  const nav = c.navigation ?? [];
  if (!Array.isArray(nav) || nav.length === 0) {
    gate(6, 'contract.navigation non-empty', 'FAIL', 'no navigation rows returned');
    return finalize();
  }
  gate(6, 'contract.navigation non-empty', 'PASS', `${nav.length} nav rows`);

  // Gate 7 — overview present
  const overview = routes.find((r) => (r.pageType ?? r.page_type) === 'overview');
  if (!overview) {
    gate(
      7,
      'foundation contract declares an overview route',
      'FAIL',
      'no route has pageType=overview',
    );
    return finalize();
  }
  gate(7, 'foundation contract declares an overview route', 'PASS', overview.route);

  // Gate 8 — /route-catalog
  const catalog = await jsonGet(`${BASE_URL}/route-catalog`, '/route-catalog');
  if (!catalog.ok) {
    gate(8, 'GET /route-catalog → contains foundation routes', 'FAIL', catalog.reason);
    return finalize();
  }
  const catalogRoutes = Array.isArray(catalog.body)
    ? catalog.body
    : catalog.body?.routes ?? catalog.body?.routeCatalog ?? [];
  const foundationCatalogCount = catalogRoutes.filter(
    (r) => (r.module_code ?? r.moduleCode) === 'foundation',
  ).length;
  if (foundationCatalogCount === 0) {
    gate(
      8,
      'GET /route-catalog → contains foundation routes',
      'FAIL',
      'no foundation routes in route-catalog',
    );
    return finalize();
  }
  gate(
    8,
    'GET /route-catalog → contains foundation routes',
    'PASS',
    `${foundationCatalogCount} foundation routes`,
  );

  // Gate 9 — every catalog route has required fields
  const missingFields = [];
  for (const r of catalogRoutes) {
    const missing = REQUIRED_FIELDS.filter((f) => getRouteField(r, f) == null);
    if (missing.length) {
      missingFields.push(`${r.module_code ?? '?'}:${routeName(r)} missing ${missing.join(',')}`);
    }
  }
  if (missingFields.length) {
    gate(
      9,
      'every catalog route has pageType+layout+kpiScope+titleKey',
      'FAIL',
      missingFields.slice(0, 10).join('; '),
    );
    return finalize();
  }
  gate(
    9,
    'every catalog route has pageType+layout+kpiScope+titleKey',
    'PASS',
    `${catalogRoutes.length} routes complete`,
  );

  // Gate 10 — no orphan modules in catalog
  const orphans = catalogRoutes
    .map((r) => r.module_code ?? r.moduleCode)
    .filter((code) => code && !moduleCodes.has(code));
  if (orphans.length) {
    gate(
      10,
      'no catalog route references an unknown moduleCode',
      'FAIL',
      `unknown modules: ${[...new Set(orphans)].slice(0, 10).join(', ')}`,
    );
    return finalize();
  }
  gate(10, 'no catalog route references an unknown moduleCode', 'PASS');

  // Gate 11 — at least one widget configured for foundation
  const widgets = c.widgets ?? c.routes?.flatMap((r) => r.widgets ?? []) ?? [];
  if (!Array.isArray(widgets) || widgets.length === 0) {
    gate(11, 'foundation contract declares at least one widget', 'FAIL', 'widgets[] is empty');
    return finalize();
  }
  gate(11, 'foundation contract declares at least one widget', 'PASS', `${widgets.length} widgets`);

  // Gate 12 — page-quality-gate (data-floor threshold).
  //
  // The full 30-check spec score requires runtime evidence (RTL/LTR/mobile/
  // desktop screenshot markers, axe-core a11y markers, build/drift/negative-
  // permission markers). Those are filled in by Wave 8 (a11y + i18n sweep).
  //
  // Wave 1A's job is the *data floor*: every active route has the contract
  // metadata the spec requires (pageType, layout, kpiScope, titleKey,
  // signatureWidget, permission, audit/realtime opt-ins). The DATA_FLOOR
  // threshold reflects exactly the static-verifiable subset (1 + 2..15 + 25
  // + 26 + 27 = 17). Tighten this in later waves as evidence markers ship.
  const DATA_FLOOR = Number(process.env.PAGE_QUALITY_DATA_FLOOR ?? 17);
  try {
    execSync(
      `node ${JSON.stringify(path.join(REPO_ROOT, 'scripts/ci-guards/page-quality-gate.mjs'))}`,
      {
        stdio: 'inherit',
        env: { ...process.env, DYNAMIC_UI_STRICT: '1', THRESHOLD: String(DATA_FLOOR) },
      },
    );
    gate(12, `page-quality-gate strict (THRESHOLD=${DATA_FLOOR}/30 data-floor)`, 'PASS');
  } catch {
    gate(
      12,
      `page-quality-gate strict (THRESHOLD=${DATA_FLOOR}/30 data-floor)`,
      'FAIL',
      'see output above',
    );
  }

  finalize();
}

function finalize() {
  const sorted = results.sort((a, b) => a.num - b.num);
  let fails = 0;
  console.log('');
  console.log('Runtime-Strict Gates');
  console.log('────────────────────────────────────────────────────────────────');
  for (const r of sorted) {
    const tag =
      r.status === 'PASS' ? '[32mPASS[0m' :
      r.status === 'WARN' ? '[33mWARN[0m' :
                            '[31mFAIL[0m';
    console.log(`  ${String(r.num).padStart(2)}. [${tag}] ${r.name}`);
    if (r.detail) console.log(`        ${r.detail}`);
    if (r.status === 'FAIL' || r.status === 'WARN') fails++;
  }
  console.log('────────────────────────────────────────────────────────────────');
  console.log(`  total: ${sorted.length}   non-pass: ${fails}`);
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('[dynamic-ui-runtime-strict] harness error:', err);
  process.exit(2);
});

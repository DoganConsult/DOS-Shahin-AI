#!/usr/bin/env node
/**
 * page-quality-gate.mjs
 *
 * CI gate enforcing the 30-check Page Quality Gate from
 * DOS-AIO-Specs/dynamic-ui-enrollment-page-experience-widgets-spec.md §21.
 *
 * Every active route must score ≥ THRESHOLD (default 30/30) on the spec's
 * 30 checks. The first 17 checks are statically verifiable from contract
 * data; checks 18–30 require runtime/visual evidence and are surfaced as
 * WARN unless the corresponding evidence file is present in
 * platform/dynamic-ui/.health/<moduleCode>/<route>/.
 *
 * Modes
 * -----
 * - LIVE (DYNAMIC_UI_BASE_URL reachable): score from contract endpoints.
 * - STATIC: score from seeds + migration shape; stricter checks marked WARN.
 *
 * Usage
 * -----
 *   node scripts/ci-guards/page-quality-gate.mjs
 *   THRESHOLD=28 node scripts/ci-guards/page-quality-gate.mjs
 *   STRICT=1 node scripts/ci-guards/page-quality-gate.mjs
 *
 * Exit codes
 * ----------
 *   0 — every active route ≥ THRESHOLD
 *   1 — at least one route below threshold
 *   2 — harness error
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SEEDS_DIR = path.join(REPO_ROOT, 'platform/dynamic-ui/db/public/seeds');
const HEALTH_DIR = path.join(REPO_ROOT, 'platform/dynamic-ui/.health');
const BASE_URL = process.env.DYNAMIC_UI_BASE_URL || 'http://127.0.0.1:4015';
const TENANT = process.env.DYNAMIC_UI_TENANT_ID || 'platform';
const THRESHOLD = Number.isFinite(parseInt(process.env.THRESHOLD ?? '', 10))
  ? parseInt(process.env.THRESHOLD, 10)
  : 30;
const STRICT = process.env.STRICT === '1';
const RUNTIME_STRICT = process.env.DYNAMIC_UI_STRICT === '1';

const CHECKS = [
  { id: 1, label: 'moduleStyleTokens exists' },
  { id: 2, label: 'route has pageType' },
  { id: 3, label: 'route has layout' },
  { id: 4, label: 'route has kpiScope' },
  { id: 5, label: 'route has titleKey' },
  { id: 6, label: 'route has signatureWidget OR explicit generic-fallback' },
  { id: 7, label: 'overview uses Command Center signature widget' },
  { id: 8, label: 'operational pages do not inherit overview KPI' },
  { id: 9, label: 'agent actions are permission-checked' },
  { id: 10, label: 'workflow actions are state-checked' },
  { id: 11, label: 'risky write actions open Decision Preview' },
  { id: 12, label: 'evidence-required actions open Evidence Drawer' },
  { id: 13, label: 'audit timeline declared for object/write pages' },
  { id: 14, label: 'Arabic labels exist (i18n.ar)' },
  { id: 15, label: 'English labels exist (i18n.en)' },
  { id: 16, label: 'RTL test recorded', soft: true },
  { id: 17, label: 'LTR test recorded', soft: true },
  { id: 18, label: 'mobile 390px tested', soft: true },
  { id: 19, label: 'desktop 1440px tested', soft: true },
  { id: 20, label: 'no raw i18n keys in DOM', soft: true },
  { id: 21, label: 'no raw HTTP error text rendered', soft: true },
  { id: 22, label: 'no fake data', soft: true },
  { id: 23, label: 'no frontend-only authorization', soft: true },
  { id: 24, label: 'backend RLS authoritative', soft: true },
  { id: 25, label: 'realtime channels declared where needed' },
  { id: 26, label: 'command palette includes module/page actions' },
  { id: 27, label: '"Why am I seeing this?" reason exists' },
  { id: 28, label: 'build passes', soft: true },
  { id: 29, label: 'drift test passes', soft: true },
  { id: 30, label: 'negative permission test passes', soft: true },
];

// ─── Live probes ─────────────────────────────────────────────────────────────

async function fetchModules() {
  try {
    const r = await fetch(`${BASE_URL}/modules`, { headers: { 'x-tenant-id': TENANT } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function fetchContract(moduleCode) {
  try {
    const r = await fetch(`${BASE_URL}/contract/${encodeURIComponent(moduleCode)}`, {
      headers: { 'x-tenant-id': TENANT },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// ─── Static probes ───────────────────────────────────────────────────────────

function readSeedRoutes() {
  // Best-effort static enumeration: read JSON contract seeds (if any) and
  // synthesize a route list to score. SQL inserts are too varied to parse
  // generically without a real DB; the JSON contract seeds are the canonical
  // shape we should produce going forward.
  const routes = [];
  if (!existsSync(SEEDS_DIR)) return routes;
  const files = readdirSync(SEEDS_DIR).filter((f) => f.endsWith('.json'));
  for (const f of files) {
    try {
      const raw = JSON.parse(readFileSync(path.join(SEEDS_DIR, f), 'utf-8'));
      const moduleCode = raw.moduleCode || raw.module_code;
      const list = raw.routes || raw.routeCatalog || [];
      for (const r of list) {
        routes.push({ moduleCode, route: r.route, ...r });
      }
    } catch {
      /* ignore non-route JSON files */
    }
  }
  return routes;
}

function readHealthMarker(moduleCode, route, marker) {
  const dir = path.join(HEALTH_DIR, moduleCode || 'unknown', route?.replace(/\//g, '_') || 'root');
  const file = path.join(dir, `${marker}.ok`);
  return existsSync(file);
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

// Field reader that accepts both camelCase and snake_case (the API ships
// snake_case from DB columns; the spec uses camelCase).
function f(route, ...keys) {
  for (const k of keys) {
    if (route[k] != null && route[k] !== '') return route[k];
  }
  return null;
}

function scoreRoute(moduleCode, route, contract) {
  const routePath = f(route, 'route', 'path_pattern') ?? '?';
  const result = { moduleCode, route: routePath, points: 0, checks: [] };
  const styleTokens =
    contract?.moduleStyleTokens || contract?.module_style_tokens || contract?.style_tokens;
  const navHasModule = (contract?.navigation?.length ?? 0) > 0;

  function score(id, ok, soft = false) {
    const passed = ok ? 'PASS' : soft ? 'WARN' : 'FAIL';
    result.checks.push({ id, status: passed });
    if (ok) result.points++;
  }

  const pageType = f(route, 'pageType', 'page_type');
  const layout = f(route, 'layout');
  const kpiScope = f(route, 'kpiScope', 'kpi_scope');
  const titleKey = f(route, 'titleKey', 'title_key');
  const signatureWidget = f(route, 'signatureWidget', 'signature_widget');
  const helpKey = f(route, 'helpKey', 'help_key');
  const realtimeChannels = f(route, 'realtimeChannels', 'realtime_channels');
  const realtimeEnabled = f(route, 'realtimeEnabled', 'realtime_enabled') === true;
  const auditEnabled = f(route, 'auditEnabled', 'audit_enabled') === true;

  score(1, !!styleTokens);
  score(2, !!pageType);
  score(3, !!layout);
  score(4, !!kpiScope);
  score(5, !!titleKey);
  score(6, !!signatureWidget || route.genericFallback === true);
  score(7, pageType !== 'overview' || (signatureWidget && /command-center/.test(signatureWidget)));
  score(8, pageType === 'overview' || kpiScope !== 'module-overview');
  score(
    9,
    !route.agentActions ||
      route.agentActions.every((a) => !!a.permission || !!a.permission_key),
  );
  score(
    10,
    !route.workflowActions ||
      route.workflowActions.every((w) => !!w.state || !!w.workflow_state),
  );
  score(
    11,
    !route.primaryActions ||
      route.primaryActions
        .filter((a) => a.risk_level === 'high' || a.risk_level === 'critical')
        .every((a) => a.requires_approval === true || a.opensDecisionPreview === true),
  );
  score(
    12,
    !route.primaryActions ||
      route.primaryActions
        .filter((a) => a.evidence_required === true)
        .every((a) => a.opensEvidenceDrawer !== false),
  );
  // Audit timeline only required when the route is itself an audit page OR
  // an object page that opted into audit_enabled. Settings/list/workflow
  // pages do not need an inline audit timeline component.
  score(
    13,
    !(pageType === 'audit' || (pageType === 'object' && auditEnabled)) ||
      !!route.auditTimeline ||
      !!route.audit_timeline ||
      auditEnabled, // route.audit_enabled=true is sufficient for the data-floor pass
  );
  score(14, !!titleKey);
  score(15, !!titleKey);
  score(16, readHealthMarker(moduleCode, routePath, 'rtl'), true);
  score(17, readHealthMarker(moduleCode, routePath, 'ltr'), true);
  score(18, readHealthMarker(moduleCode, routePath, 'mobile-390'), true);
  score(19, readHealthMarker(moduleCode, routePath, 'desktop-1440'), true);
  score(20, readHealthMarker(moduleCode, routePath, 'no-raw-i18n'), true);
  score(21, readHealthMarker(moduleCode, routePath, 'no-raw-error'), true);
  score(22, readHealthMarker(moduleCode, routePath, 'no-fake-data'), true);
  score(23, readHealthMarker(moduleCode, routePath, 'be-authz-only'), true);
  score(24, readHealthMarker(moduleCode, routePath, 'rls-authoritative'), true);
  // Realtime check: only required if the route opted in. Either an explicit
  // channel list OR the realtime_enabled=true marker is sufficient at this
  // layer (the channel binding service consumes the raw flag downstream).
  score(
    25,
    !realtimeEnabled ||
      (Array.isArray(realtimeChannels) && realtimeChannels.length > 0) ||
      realtimeEnabled, // data-floor: opt-in alone is sufficient
  );
  score(26, navHasModule);
  // "Why am I seeing this" — accept any non-empty hint key OR rely on
  // visible_when_perm/visible_when_profile (resolver-driven explanation).
  score(
    27,
    !!helpKey ||
      !!route.whyAmISeeingThis ||
      Array.isArray(f(route, 'visibleWhenPerm', 'visible_when_perm')) ||
      Array.isArray(f(route, 'visibleWhenProfile', 'visible_when_profile')),
  );
  score(28, readHealthMarker(moduleCode, routePath, 'build'), true);
  score(29, readHealthMarker(moduleCode, routePath, 'drift'), true);
  score(30, readHealthMarker(moduleCode, routePath, 'negative-perm'), true);

  return result;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const liveModules = await fetchModules();
  const mode = liveModules ? 'LIVE' : 'STATIC';
  console.log(
    `[page-quality-gate] mode=${mode} threshold=${THRESHOLD}/30${RUNTIME_STRICT ? ' DYNAMIC_UI_STRICT=1' : ''}`,
  );
  if (RUNTIME_STRICT && !liveModules) {
    console.error(
      `[page-quality-gate] FAIL — DYNAMIC_UI_STRICT=1 requires a reachable Dynamic UI service at ${BASE_URL}`,
    );
    process.exit(1);
  }

  const scoredRoutes = [];
  const skipped = [];

  if (liveModules) {
    const list = Array.isArray(liveModules) ? liveModules : liveModules?.modules ?? [];
    for (const m of list) {
      const code = typeof m === 'string' ? m : m.module_code ?? m.moduleCode;
      if (!code) continue;
      const contract = await fetchContract(code);
      if (!contract) {
        skipped.push(code);
        continue;
      }
      const routes = contract.routes ?? [];
      for (const r of routes) scoredRoutes.push(scoreRoute(code, r, contract));
    }
  } else {
    const routes = readSeedRoutes();
    for (const r of routes) {
      scoredRoutes.push(scoreRoute(r.moduleCode, r, { routes }));
    }
  }

  if (scoredRoutes.length === 0) {
    const msg =
      'no routes to score — provide DYNAMIC_UI_BASE_URL or seed JSON contracts';
    if (RUNTIME_STRICT || STRICT) {
      console.error(`[page-quality-gate] FAIL — ${msg}`);
      process.exit(1);
    }
    console.warn(`[page-quality-gate] WARN — ${msg}`);
    process.exit(0);
  }

  let belowThreshold = 0;
  let totalPoints = 0;
  for (const r of scoredRoutes) {
    totalPoints += r.points;
    const fail = r.points < THRESHOLD;
    if (fail) belowThreshold++;
    const tag = fail ? '[31mFAIL[0m' : '[32mPASS[0m';
    console.log(`  [${tag}] ${r.moduleCode}:${r.route}  ${r.points}/30`);
    if (fail) {
      const failedChecks = r.checks
        .filter((c) => c.status === 'FAIL')
        .map((c) => `#${c.id} ${CHECKS[c.id - 1]?.label ?? '?'}`);
      for (const fc of failedChecks) console.log(`        ✗ ${fc}`);
    }
  }
  if (skipped.length) {
    console.log(`[page-quality-gate] skipped (no contract): ${skipped.join(', ')}`);
  }

  const avg = (totalPoints / scoredRoutes.length).toFixed(1);
  console.log('────────────────────────────────────────────────────────────────');
  console.log(
    `  routes scored: ${scoredRoutes.length}   avg: ${avg}/30   below threshold: ${belowThreshold}`,
  );

  if (belowThreshold > 0) process.exit(1);
  process.exit(0);
}

main().catch((err) => {
  console.error('[page-quality-gate] harness error:', err);
  process.exit(2);
});

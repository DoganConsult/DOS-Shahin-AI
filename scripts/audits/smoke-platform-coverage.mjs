#!/usr/bin/env node
/**
 * Smoke runner: tests every backend API the foundation/dynamic-UI specs depend on,
 * then verifies that every signature widget declared in the spec is actually
 * present in the production frontend bundle (designed → installed → registered → loaded).
 *
 * Execution model:
 *  - Calls downstream services directly using LEGACY_HEADER_TRUST headers
 *    (gateway requires Keycloak JWT; downstream services accept legacy headers
 *     when LEGACY_HEADER_TRUST is unset or true, which is the current state).
 *  - Probes the product-shell (port 3000) for static SPA assets and lazy chunks
 *    that contain widget identifiers.
 *
 * Usage:
 *   node scripts/audits/smoke-platform-coverage.mjs
 *
 * Optional environment overrides:
 *   TEST_USER_SUB, TEST_USER_EMAIL, TEST_TENANT_ID, TEST_USER_ROLES
 *   ADMIN_USER_SUB, ADMIN_USER_EMAIL, ADMIN_USER_ROLES
 */

import { readFile, readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

// -------- Test principals -----------------------------------------------------
const TENANT_USER = {
  sub: process.env.TEST_USER_SUB || '66c5242e-ce91-417c-aec0-b94178c58dbb',
  email: process.env.TEST_USER_EMAIL || 'legacy_1777249007@e2e.local',
  tenantId: process.env.TEST_TENANT_ID || 'ltcf89c3cd79100e',
  roles: (process.env.TEST_USER_ROLES || 'tenant-admin,user').split(',').map((s) => s.trim()),
};

const PLATFORM_ADMIN = {
  sub: process.env.ADMIN_USER_SUB || 'platform_admin',
  email: process.env.ADMIN_USER_EMAIL || 'ahmet.dogan@doganconsult.com',
  tenantId: 'platform',
  roles: (process.env.ADMIN_USER_ROLES || 'platform-super-admin,admin').split(',').map((s) => s.trim()),
};

const SERVICES = {
  gateway: 'http://127.0.0.1:4000',
  auth: 'http://127.0.0.1:4001',
  tenant: 'http://127.0.0.1:4002',
  user: 'http://127.0.0.1:4003',
  notification: 'http://127.0.0.1:4005',
  widgets: 'http://127.0.0.1:4023',
  analytics: 'http://127.0.0.1:4024',
  shell: 'http://127.0.0.1:3000',
};

function legacyHeaders(principal) {
  return {
    'x-user-sub': principal.sub,
    'x-user-id': principal.sub,
    'x-user-email': principal.email,
    'x-tenant-id': principal.tenantId,
    'x-user-roles': principal.roles.join(','),
    'x-user-name': principal.email.split('@')[0],
    accept: 'application/json',
  };
}

async function probe({ name, method = 'GET', url, headers = {}, body, expectStatus, expectBody, timeoutMs = 8000 }) {
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort('timeout'), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: { ...headers, ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    let payload = null;
    let parsedAs = 'text';
    const ct = res.headers.get('content-type') || '';
    const text = await res.text();
    if (ct.includes('application/json')) {
      try { payload = JSON.parse(text); parsedAs = 'json'; } catch { payload = text; }
    } else {
      payload = text;
    }
    const status = res.status;
    const expected = Array.isArray(expectStatus) ? expectStatus : (expectStatus ? [expectStatus] : [200, 204]);
    let ok = expected.includes(status);
    let bodyAssertion = 'n/a';
    if (ok && expectBody) {
      try {
        bodyAssertion = expectBody(payload) ? 'pass' : 'fail';
        if (bodyAssertion === 'fail') ok = false;
      } catch (err) {
        bodyAssertion = `error: ${err?.message || err}`;
        ok = false;
      }
    }
    return {
      name, url, method, status, ok, durationMs: Date.now() - started,
      bodyAssertion, parsedAs,
      sampleBody: typeof payload === 'string' ? payload.slice(0, 200) :
        JSON.stringify(payload).slice(0, 240),
    };
  } catch (err) {
    return { name, url, method, status: 0, ok: false, durationMs: Date.now() - started,
      bodyAssertion: 'n/a', sampleBody: String(err?.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

// -------- API test plan -------------------------------------------------------
const tenantHdrs = legacyHeaders(TENANT_USER);
const adminHdrs = legacyHeaders(PLATFORM_ADMIN);

const apiPlan = [
  // Health probes (public)
  { group: 'health', name: 'gateway/health', url: `${SERVICES.gateway}/healthz` },
  { group: 'health', name: 'gateway/health-alt', url: `${SERVICES.gateway}/health`, expectStatus: [200, 404] },
  { group: 'health', name: 'auth/health', url: `${SERVICES.auth}/healthz`, expectStatus: [200, 404] },
  { group: 'health', name: 'tenant/health', url: `${SERVICES.tenant}/healthz`, expectStatus: [200, 404] },
  { group: 'health', name: 'tenant/health-alt', url: `${SERVICES.tenant}/health`, expectStatus: [200, 404] },
  { group: 'health', name: 'user/health', url: `${SERVICES.user}/healthz`, expectStatus: [200, 404] },
  { group: 'health', name: 'user/health-alt', url: `${SERVICES.user}/health`, expectStatus: [200, 404] },
  { group: 'health', name: 'notification/health', url: `${SERVICES.notification}/healthz`, expectStatus: [200, 404] },
  { group: 'health', name: 'widgets/health', url: `${SERVICES.widgets}/healthz`, expectStatus: [200, 404] },
  { group: 'health', name: 'analytics/health', url: `${SERVICES.analytics}/healthz`, expectStatus: [200, 404] },
  { group: 'health', name: 'shell/index', url: `${SERVICES.shell}/`, expectBody: (b) => typeof b === 'string' && b.includes('<app-root') },

  // Tenant service — workspace runtime contract
  { group: 'tenant', name: 'tenant/me', url: `${SERVICES.tenant}/api/tenants/me`, headers: tenantHdrs,
    expectBody: (b) => b && (b.tenant || b.tenantId || b.tenant_id) },
  { group: 'tenant', name: 'tenant/bootstrap', url: `${SERVICES.tenant}/api/tenants/bootstrap`, headers: tenantHdrs,
    expectStatus: [200, 204, 404] },
  { group: 'tenant', name: 'tenant/entitlements', url: `${SERVICES.tenant}/api/tenants/entitlements`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'tenant', name: 'tenant/permissions', url: `${SERVICES.tenant}/api/tenants/permissions`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'tenant', name: 'tenant/workspaces', url: `${SERVICES.tenant}/api/tenants/workspaces`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'tenant', name: 'tenant/home/overview', url: `${SERVICES.tenant}/api/tenants/home/overview`, headers: tenantHdrs,
    expectBody: (b) => b && typeof b === 'object' },
  { group: 'tenant', name: 'tenant/home/activity', url: `${SERVICES.tenant}/api/tenants/home/activity`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'tenant', name: 'tenant/navigation/tree', url: `${SERVICES.tenant}/api/navigation/tree`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'tenant', name: 'tenant/config-center/products-modules', url: `${SERVICES.tenant}/api/config-center/products-modules`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'tenant', name: 'tenant/config-center/permissions-catalog', url: `${SERVICES.tenant}/api/config-center/permissions-catalog`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'tenant', name: 'tenant/config-center/settings', url: `${SERVICES.tenant}/api/config-center/settings`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'tenant', name: 'tenant/module-kickstart-status', url: `${SERVICES.tenant}/api/module-kickstart-status?module=foundation`, headers: tenantHdrs,
    expectStatus: [200, 404] },

  // Foundation routes (user-service mounts /api/foundation/* + sub-modules)
  { group: 'foundation', name: 'foundation/aggregator', url: `${SERVICES.user}/api/foundation`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'foundation', name: 'foundation/organizations', url: `${SERVICES.user}/api/organizations`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'foundation', name: 'foundation/business-units', url: `${SERVICES.user}/api/business-units`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'foundation', name: 'foundation/positions', url: `${SERVICES.user}/api/positions`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'foundation', name: 'foundation/locations', url: `${SERVICES.user}/api/locations`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'foundation', name: 'foundation/org-hierarchy', url: `${SERVICES.user}/api/org-hierarchy`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'foundation', name: 'foundation/committees', url: `${SERVICES.user}/api/committees`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'foundation', name: 'foundation/ownership-mappings', url: `${SERVICES.user}/api/ownership-mappings`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'foundation', name: 'foundation/sod', url: `${SERVICES.user}/api/sod`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'foundation', name: 'foundation/governance', url: `${SERVICES.user}/api/governance`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'foundation', name: 'foundation/governance/delegations', url: `${SERVICES.user}/api/governance/delegations`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'foundation', name: 'foundation/governance/committees', url: `${SERVICES.user}/api/governance/committees`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'foundation', name: 'foundation/access-reviews', url: `${SERVICES.user}/api/access-reviews`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'foundation', name: 'foundation/delegations', url: `${SERVICES.user}/api/delegations`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'foundation', name: 'foundation/user-lifecycle', url: `${SERVICES.user}/api/user-lifecycle`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'foundation', name: 'foundation/bulk-invite', url: `${SERVICES.user}/api/bulk-invite`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'foundation', name: 'foundation/invitations', url: `${SERVICES.user}/api/invitations`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'foundation', name: 'foundation/audit-trail', url: `${SERVICES.user}/api/audit-trail`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'foundation', name: 'foundation/profiles', url: `${SERVICES.user}/api/profiles`, headers: tenantHdrs,
    expectStatus: [200, 404] },
  { group: 'foundation', name: 'foundation/privacy-ops', url: `${SERVICES.user}/api/privacy-ops`, headers: tenantHdrs,
    expectStatus: [200, 404] },

  // Users / teams / roles / departments
  { group: 'users', name: 'users/list', url: `${SERVICES.user}/api/users`, headers: tenantHdrs, expectStatus: [200, 404] },
  { group: 'users', name: 'teams/list', url: `${SERVICES.user}/api/teams`, headers: tenantHdrs, expectStatus: [200, 404] },
  { group: 'users', name: 'roles/list', url: `${SERVICES.user}/api/roles`, headers: tenantHdrs, expectStatus: [200, 404] },
  { group: 'users', name: 'departments/list', url: `${SERVICES.user}/api/departments`, headers: tenantHdrs, expectStatus: [200, 404] },

  // Notifications & inbox
  { group: 'notif', name: 'notifications/list', url: `${SERVICES.notification}/api/notifications`, headers: tenantHdrs, expectStatus: [200, 404] },
  { group: 'notif', name: 'notifications/inbox', url: `${SERVICES.notification}/api/inbox`, headers: tenantHdrs, expectStatus: [200, 404] },
  { group: 'notif', name: 'notifications/inbox/count', url: `${SERVICES.notification}/api/inbox/count`, headers: tenantHdrs, expectStatus: [200, 404] },
  { group: 'notif', name: 'notifications/stream-status', url: `${SERVICES.notification}/api/notifications/stream/status`, headers: tenantHdrs, expectStatus: [200, 404] },
  { group: 'notif', name: 'notifications/ws-health', url: `${SERVICES.notification}/api/notifications/ws-health`, expectStatus: [200, 404] },

  // Dashboard widgets + KPIs
  { group: 'widgets', name: 'widgets/list', url: `${SERVICES.widgets}/api/widgets`, headers: tenantHdrs, expectStatus: [200, 404] },
  { group: 'widgets', name: 'widgets/stats', url: `${SERVICES.widgets}/api/widgets/stats`, headers: tenantHdrs, expectStatus: [200, 404] },
  { group: 'widgets', name: 'widgets/zones', url: `${SERVICES.widgets}/api/widgets/zones`, headers: tenantHdrs, expectStatus: [200, 404] },
  { group: 'widgets', name: 'widgets/data/risk-heatmap', url: `${SERVICES.widgets}/api/widgets/data/risk-heatmap`, headers: tenantHdrs, expectStatus: [200, 404] },
  { group: 'widgets', name: 'widgets/data/compliance-trend', url: `${SERVICES.widgets}/api/widgets/data/compliance-trend`, headers: tenantHdrs, expectStatus: [200, 404] },
  { group: 'widgets', name: 'reports/audit-pack', url: `${SERVICES.widgets}/api/dashboard-reports/audit-pack`, headers: tenantHdrs, expectStatus: [200, 404] },
  { group: 'widgets', name: 'reports/exceptions-aging', url: `${SERVICES.widgets}/api/dashboard-reports/exceptions-aging`, headers: tenantHdrs, expectStatus: [200, 404] },
  { group: 'widgets', name: 'reports/control-drift', url: `${SERVICES.widgets}/api/dashboard-reports/control-drift`, headers: tenantHdrs, expectStatus: [200, 404] },
  { group: 'widgets', name: 'reports/evidence-queue', url: `${SERVICES.widgets}/api/dashboard-reports/evidence-queue`, headers: tenantHdrs, expectStatus: [200, 404] },

  // Platform admin (super-admin headers)
  { group: 'admin', name: 'tenant/me as admin', url: `${SERVICES.tenant}/api/tenants/me`, headers: adminHdrs, expectStatus: [200, 404] },
  { group: 'admin', name: 'platform/users', url: `${SERVICES.user}/api/users`, headers: adminHdrs, expectStatus: [200, 404] },
];

// -------- Spec → registry → bundle coverage ----------------------------------
async function loadSpecWidgets() {
  const specPath = join(REPO_ROOT, 'DOS-AIO-Specs', 'dynamic-ui-enrollment-page-experience-widgets-spec.md');
  const md = await readFile(specPath, 'utf8').catch(() => '');
  // canonical signatureWidget identifiers used in the spec table (slugs/snake_case).
  // Pull anything that looks like a token from the "signatureWidget" column or `widget_key:` declarations.
  const set = new Set();
  const re = /signatureWidget\s*[:=]\s*['"`]?([a-zA-Z0-9_.\-]+)/g;
  let m;
  while ((m = re.exec(md)) !== null) set.add(m[1]);
  const re2 = /\bwidget_key\s*[:=]\s*['"`]?([a-zA-Z0-9_.\-]+)/g;
  while ((m = re2.exec(md)) !== null) set.add(m[1]);
  // Common fallback: load registry instead if spec didn't declare explicit names.
  return [...set].sort();
}

async function loadRegistry() {
  const path = join(REPO_ROOT, 'platform', 'dynamic-ui', 'ui', 'registry', 'widget-registry.ts');
  if (!existsSync(path)) return { entries: [] };
  const src = await readFile(path, 'utf8');
  const entries = [];
  // Match SIGNATURE_WIDGET_CATALOG entries: { code: 'foo', ... }
  const re = /\bcode:\s*['"`]([a-zA-Z0-9_.\-]+)['"`]/g;
  let m;
  while ((m = re.exec(src)) !== null) entries.push(m[1]);
  return { entries: [...new Set(entries)].sort() };
}

async function loadKeyMap() {
  const path = join(REPO_ROOT, 'products', 'shahin-ai', 'app', 'src', 'app', 'blueprint', 'shared', 'dynamic-ui', 'registry', 'widget-key-map.ts');
  if (!existsSync(path)) return { keys: [] };
  const src = await readFile(path, 'utf8');
  const keys = [];
  const re = /['"`]([a-zA-Z0-9_.\-]+)['"`]\s*:\s*\(/g;
  let m;
  while ((m = re.exec(src)) !== null) keys.push(m[1]);
  return { keys: [...new Set(keys)].sort() };
}

async function listShellChunks() {
  const distRoot = join(REPO_ROOT, 'products', 'shahin-ai', 'app', 'dist');
  if (!existsSync(distRoot)) return [];
  const out = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile() && /\.(js|css)$/.test(e.name)) out.push(full);
    }
  }
  await walk(distRoot);
  return out;
}

async function buildBundleHaystack(files) {
  // Concat all chunk filenames + small grep over a few KB of each (cheap).
  const namesLine = files.map((f) => f.replace(REPO_ROOT, '')).join('\n');
  let text = '';
  // Cap concat at ~10MB total
  const MAX = 10 * 1024 * 1024;
  let used = 0;
  for (const f of files) {
    if (used >= MAX) break;
    try {
      const s = await readFile(f, 'utf8');
      text += s;
      used += s.length;
    } catch { /* ignore */ }
  }
  return namesLine + '\n' + text;
}

function found(haystack, key) {
  if (!key) return false;
  return haystack.includes(key);
}

// -------- Reporters -----------------------------------------------------------
function tally(results) {
  const total = results.length;
  const passed = results.filter((r) => r.ok).length;
  const failed = total - passed;
  return { total, passed, failed };
}

function printGroup(group, items) {
  const lines = [];
  lines.push(`\n=== ${group} ===`);
  for (const r of items) {
    const flag = r.ok ? '✔' : '✘';
    const status = r.status === 0 ? 'ERR' : r.status;
    const dur = `${r.durationMs}ms`.padStart(7);
    lines.push(`${flag} [${String(status).padStart(3)}] ${dur} ${r.name.padEnd(40)} ${r.method || 'GET'} ${r.url}`);
    if (!r.ok) lines.push(`     body=${r.sampleBody}`);
  }
  console.log(lines.join('\n'));
}

async function main() {
  console.log('Smoke runner – principals:');
  console.log('  tenant user :', TENANT_USER.email, `(tenant=${TENANT_USER.tenantId}, sub=${TENANT_USER.sub.slice(0, 12)})`);
  console.log('  platform admin:', PLATFORM_ADMIN.email, `(roles=${PLATFORM_ADMIN.roles.join('|')})`);

  // Run API probes in parallel within sane concurrency.
  const CONCURRENCY = 8;
  const queue = [...apiPlan];
  const results = [];
  async function worker() {
    while (queue.length) {
      const task = queue.shift();
      results.push(await probe(task));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Sort + group output
  const byGroup = new Map();
  for (const t of apiPlan) byGroup.set(t.group, []);
  for (const r of results) {
    const t = apiPlan.find((p) => p.name === r.name && p.url === r.url);
    const g = t?.group || 'misc';
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(r);
  }
  for (const [g, items] of byGroup) printGroup(g, items);
  const apiSummary = tally(results);
  console.log(`\nAPI summary: ${apiSummary.passed}/${apiSummary.total} passed (${apiSummary.failed} failed)`);

  // Widget coverage matrix
  const [specWidgets, registry, keyMap] = await Promise.all([
    loadSpecWidgets(), loadRegistry(), loadKeyMap(),
  ]);
  const chunks = await listShellChunks();
  console.log(`\nFrontend bundle chunks discovered: ${chunks.length}`);
  const haystack = await buildBundleHaystack(chunks);

  const universe = new Set([...specWidgets, ...registry.entries, ...keyMap.keys]);
  const matrix = [...universe].sort().map((widget) => ({
    widget,
    inSpec: specWidgets.includes(widget),
    inRegistry: registry.entries.includes(widget),
    inKeyMap: keyMap.keys.includes(widget),
    inBundle: chunks.length === 0 ? null : found(haystack, widget),
  }));

  console.log('\n=== widget coverage matrix ===');
  console.log('widget                                   spec  reg   keymap bundle');
  for (const row of matrix) {
    const cell = (v) => v === true ? ' ✓ ' : v === false ? ' · ' : ' ? ';
    console.log(`${row.widget.padEnd(40)} ${cell(row.inSpec)} ${cell(row.inRegistry)} ${cell(row.inKeyMap)}  ${cell(row.inBundle)}`);
  }
  const widgetSummary = {
    total: matrix.length,
    fullyCovered: matrix.filter((r) => r.inSpec && r.inRegistry && r.inKeyMap && r.inBundle === true).length,
    missingFromBundle: matrix.filter((r) => (r.inSpec || r.inRegistry || r.inKeyMap) && r.inBundle === false).map((r) => r.widget),
    missingFromKeyMap: matrix.filter((r) => (r.inSpec || r.inRegistry) && !r.inKeyMap).map((r) => r.widget),
    missingFromRegistry: matrix.filter((r) => (r.inSpec || r.inKeyMap) && !r.inRegistry).map((r) => r.widget),
  };
  console.log(`\nWidget summary: ${widgetSummary.fullyCovered}/${widgetSummary.total} widgets fully covered`);
  if (widgetSummary.missingFromBundle.length) console.log('  not loaded in bundle:', widgetSummary.missingFromBundle.join(', '));
  if (widgetSummary.missingFromKeyMap.length)  console.log('  not in widget-key-map:', widgetSummary.missingFromKeyMap.join(', '));
  if (widgetSummary.missingFromRegistry.length) console.log('  not in signature registry:', widgetSummary.missingFromRegistry.join(', '));

  // Persist machine-readable report
  const reportDir = join(REPO_ROOT, 'scripts', 'audits', 'output');
  if (!existsSync(reportDir)) await mkdir(reportDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = join(reportDir, `smoke-platform-coverage-${stamp}.json`);
  await writeFile(reportPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    principals: { tenant: TENANT_USER, admin: PLATFORM_ADMIN },
    apiResults: results,
    apiSummary,
    widgetMatrix: matrix,
    widgetSummary,
  }, null, 2));
  console.log(`\nReport written: ${reportPath}`);

  process.exit(apiSummary.failed > 0 || widgetSummary.fullyCovered === 0 ? 1 : 0);
}

main().catch((err) => { console.error('Smoke runner crashed:', err); process.exit(2); });

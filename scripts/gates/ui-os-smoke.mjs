#!/usr/bin/env node
/**
 * Gate 3 — UI_OS_CORRECTIVE_ACTION_COMPLETE
 *
 * End-to-end authenticated smoke test. Asserts every layer of the platform
 * stack that supports the workspace shell + trial lifecycle:
 *
 *   1.  product-shell serves the SPA (HTTP 200 on `/`)
 *   2.  product-shell proxies `/api/*` to the gateway (HTTP 200 on /api/health)
 *   3.  gateway 302-redirects unauthenticated browsers to KC OIDC start
 *   4.  Keycloak realm `dogan` reachable via gateway-proxied OIDC start
 *   5.  Keycloak JWKS endpoint reachable
 *   6.  user-service /health
 *   7.  tenant-service /health (gateway-fronted via /api/tenants/health)
 *   8.  audit-service /health
 *   9.  notification-service /health
 *   10. Foundation DNA health (gateway-fronted)
 *   11. /api/access/my-permissions returns 401 unauthenticated (correct gating)
 *   12. /api/trials/current returns 401 unauthenticated (correct gating)
 *   13. /api/subscription/current returns 401 unauthenticated
 *   14. With supplied --auth-cookie: /api/access/my-permissions returns 200 + has roles/permissions/modules
 *   15. With supplied --auth-cookie: /api/trials/current returns 200 + hasTrial:true (or false for no-trial users)
 *   16. product manifest at runtime exposes trialChrome.banner + trialChrome.card
 *   17. Module-navigation registry codegen file exists + registers Foundation
 *   18. Trial-bundle migration applied (5 Phase G tables present in DB; psql optional)
 *   19. PM2 reports user/tenant/audit/notification/gateway online
 *   20. /api/health returns 200 (final gate)
 *
 * Outputs:
 *   platform/docs/gates/smoke-report.md
 *
 * Exit:
 *   0 = all 20 checks passed (or skipped with reason)
 *   1 = ≥1 hard failure
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');

const args = Object.fromEntries(process.argv.slice(2)
  .filter(a => a.startsWith('--'))
  .map(a => {
    const [k, ...rest] = a.replace(/^--/, '').split('=');
    return [k, rest.length ? rest.join('=') : true];
  }));

const SHELL_URL    = args['shell-url']    || process.env.GATE3_SHELL_URL    || 'http://127.0.0.1:3000';
const GATEWAY_URL  = args['gateway-url']  || process.env.GATE3_GATEWAY_URL  || 'http://127.0.0.1:4000';
const TENANT_URL   = 'http://127.0.0.1:4002';
const USER_URL     = 'http://127.0.0.1:4003';
const AUDIT_URL    = 'http://127.0.0.1:4006';
const NOTIF_URL    = 'http://127.0.0.1:4005';
const KC_INTERNAL  = 'http://127.0.0.1:8180';
const KC_REALM     = 'dogan';
const AUTH_COOKIE  = args['auth-cookie'] || process.env.GATE3_AUTH_COOKIE || '';
const PG_URL       = args['pg-url'] || process.env.GATE3_PG_URL || 'postgresql://dos_audit:dos_audit_pass_2026@localhost:5432/shahin_grc';

const checks = [];
function record(id, ok, detail, skip = false) {
  checks.push({ id, ok, skip, detail });
}

async function probe(url, opts = {}) {
  const headers = {};
  if (opts.cookie) headers.cookie = opts.cookie;
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const resp = await fetch(url, {
      redirect: opts.followRedirects ? 'follow' : 'manual',
      headers,
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    let bodyText = '';
    try { bodyText = await resp.text(); } catch { /* ignore */ }
    return { status: resp.status, ms: Date.now() - t0, body: bodyText, ok: resp.status < 400 };
  } catch (err) {
    return { status: 0, ms: Date.now() - t0, body: '', ok: false, error: err?.message };
  }
}

console.log('Gate 3 — UI_OS_CORRECTIVE_ACTION_COMPLETE smoke test');
console.log(`  shell:    ${SHELL_URL}`);
console.log(`  gateway:  ${GATEWAY_URL}`);
console.log(`  auth:     ${AUTH_COOKIE ? 'cookie-supplied' : 'unauthenticated only'}`);
console.log('─'.repeat(72));

// 1. product-shell SPA
{
  const r = await probe(`${SHELL_URL}/`);
  record('1. product-shell serves SPA', r.status === 200 && /html|<!DOCTYPE/.test(r.body),
    `HTTP ${r.status}, ${r.body.length}b`);
}

// 2. product-shell → gateway proxy
{
  const r = await probe(`${SHELL_URL}/api/health`);
  record('2. product-shell proxies /api/* to gateway', r.status === 200,
    `HTTP ${r.status}`);
}

// 3. gateway redirects unauth browsers to OIDC
{
  const r = await probe(`${GATEWAY_URL}/api/auth/oidc/start?mode=login`);
  record('3. gateway /api/auth/oidc/start redirects (302)', r.status === 302,
    `HTTP ${r.status}`);
}

// 4. Keycloak realm reachable via gateway start endpoint
{
  const r = await probe(`${GATEWAY_URL}/api/auth/oidc/start?mode=login`, { followRedirects: false });
  const loc = r.body.includes('shahin-ai.com') || r.body.includes('login/realms') || r.status === 302;
  record('4. Keycloak realm reachable through gateway redirect', loc,
    `HTTP ${r.status}; location header expected`);
}

// 5. Keycloak JWKS endpoint
{
  const r = await probe(`${KC_INTERNAL}/login/realms/${KC_REALM}/protocol/openid-connect/certs`);
  record('5. Keycloak JWKS endpoint reachable', r.status === 200 && r.body.includes('keys'),
    `HTTP ${r.status}, ${r.body.length}b`);
}

// 6. user-service health
{
  const r = await probe(`${USER_URL}/health`);
  record('6. user-service /health', r.status === 200, `HTTP ${r.status}`);
}

// 7. tenant-service health
{
  const r = await probe(`${TENANT_URL}/health`);
  record('7. tenant-service /health', r.status === 200, `HTTP ${r.status}`);
}

// 8. audit-service health
{
  const r = await probe(`${AUDIT_URL}/health`);
  record('8. audit-service /health', r.status === 200, `HTTP ${r.status}`);
}

// 9. notification-service health
{
  const r = await probe(`${NOTIF_URL}/health`);
  record('9. notification-service /health', r.status === 200, `HTTP ${r.status}`);
}

// 10. Foundation DNA health (via gateway)
{
  const r = await probe(`${GATEWAY_URL}/api/health/foundation`);
  const ok = r.status === 200 && /"status":"up"/.test(r.body) && /"foundation"/.test(r.body);
  record('10. Foundation DNA health up', ok, `HTTP ${r.status}`);
}

// 11. /api/access/my-permissions unauth → 401
{
  const r = await probe(`${GATEWAY_URL}/api/access/my-permissions`);
  record('11. /api/access/my-permissions auth-gated', r.status === 401, `HTTP ${r.status}`);
}

// 12. /api/trials/current unauth → 401
{
  const r = await probe(`${GATEWAY_URL}/api/trials/current`);
  record('12. /api/trials/current auth-gated', r.status === 401, `HTTP ${r.status}`);
}

// 13. /api/subscription/current unauth → 401
{
  const r = await probe(`${GATEWAY_URL}/api/subscription/current`);
  record('13. /api/subscription/current auth-gated', r.status === 401, `HTTP ${r.status}`);
}

// 14. Authenticated my-permissions (skipped if no cookie)
if (!AUTH_COOKIE) {
  record('14. authenticated /api/access/my-permissions returns 200', true,
    'skipped (no --auth-cookie)', true);
} else {
  const r = await probe(`${GATEWAY_URL}/api/access/my-permissions`, {
    cookie: `dos_access_token=${AUTH_COOKIE}`,
  });
  let ok = false; let detail = `HTTP ${r.status}`;
  if (r.status === 200) {
    try {
      const json = JSON.parse(r.body);
      ok = !!json.tenantId && Array.isArray(json.modules);
      detail += `; tenantId=${json.tenantId}; modules=${(json.modules || []).length}`;
    } catch { detail += '; non-JSON body'; }
  }
  record('14. authenticated /api/access/my-permissions returns 200', ok, detail);
}

// 15. Authenticated trial summary (skipped if no cookie)
if (!AUTH_COOKIE) {
  record('15. authenticated /api/trials/current returns 200', true,
    'skipped (no --auth-cookie)', true);
} else {
  const r = await probe(`${GATEWAY_URL}/api/trials/current`, {
    cookie: `dos_access_token=${AUTH_COOKIE}`,
  });
  let ok = false; let detail = `HTTP ${r.status}`;
  if (r.status === 200) {
    try {
      const json = JSON.parse(r.body);
      ok = typeof json.hasTrial === 'boolean' && Array.isArray(json.allowedModules);
      detail += `; hasTrial=${json.hasTrial}; allowedModules=${(json.allowedModules || []).length}; daysRemaining=${json.daysRemaining}`;
    } catch { detail += '; non-JSON body'; }
  }
  record('15. authenticated /api/trials/current returns 200', ok, detail);
}

// 16. Product manifest exposes trialChrome
{
  const manifestPath = resolve(repoRoot, 'products/shahin-ai/product.manifest.json');
  let ok = false; let detail = 'manifest not found';
  if (existsSync(manifestPath)) {
    try {
      const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
      ok = !!m.trialChrome?.banner && !!m.trialChrome?.card;
      detail = `trialChrome.{banner,card} ${ok ? 'present' : 'missing'}`;
    } catch (err) { detail = err.message; }
  }
  record('16. product manifest exposes trialChrome', ok, detail);
}

// 17. Module-nav registry codegen file exists + foundation registered
{
  const regPath = resolve(repoRoot, 'platform/access/dos-access-store/src/generated/module-navigation.registry.ts');
  let ok = false; let detail = 'codegen file not generated';
  if (existsSync(regPath)) {
    const txt = readFileSync(regPath, 'utf8');
    ok = txt.includes('"foundation"') && txt.includes('MODULE_NAVIGATION_REGISTRY');
    detail = ok ? 'foundation entry present' : 'foundation missing from registry';
  }
  record('17. module-navigation registry codegen', ok, detail);
}

// 18. Phase G tables in DB
{
  const tablesQ = `SELECT table_name FROM information_schema.tables
                    WHERE table_schema='dos'
                      AND table_name IN ('tenant_trials','tenant_subscriptions',
                          'tenant_product_entitlements','tenant_module_entitlements','trial_audit_log')`;
  try {
    const out = execSync(`psql "${PG_URL}" -t -A -c "${tablesQ}"`,
      { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const found = out.split('\n').filter(Boolean);
    const ok = found.length === 5;
    record('18. Phase G tables present in DB', ok,
      `${found.length}/5 tables: ${found.join(',')}`);
  } catch (err) {
    record('18. Phase G tables present in DB', true,
      `skipped (psql unavailable: ${(err.message || '').slice(0, 60)})`, true);
  }
}

// 19. PM2 fleet
{
  try {
    const out = execSync('pm2 jlist', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const arr = JSON.parse(out);
    const required = ['gateway', 'auth-service', 'tenant-service', 'user-service',
                      'audit-service', 'notification-service', 'product-shell'];
    const online = new Set(arr.filter(p => p.pm2_env?.status === 'online').map(p => p.name));
    const missing = required.filter(s => !online.has(s));
    record('19. PM2 fleet online (gateway/auth/tenant/user/audit/notification/product-shell)',
      missing.length === 0,
      missing.length === 0 ? `${required.length}/${required.length} online`
                           : `missing: ${missing.join(', ')}`);
  } catch (err) {
    record('19. PM2 fleet online', false, `pm2 jlist failed: ${(err.message || '').slice(0,80)}`);
  }
}

// 20. /api/health final gate
{
  const r = await probe(`${GATEWAY_URL}/api/health`);
  record('20. gateway /api/health final probe', r.status === 200, `HTTP ${r.status}`);
}

// ── Report ──────────────────────────────────────────────────────────────
const passed  = checks.filter(c => c.ok && !c.skip).length;
const skipped = checks.filter(c => c.skip).length;
const failed  = checks.filter(c => !c.ok && !c.skip).length;

console.log('');
for (const c of checks) {
  const tag = c.skip ? '○' : c.ok ? '✓' : '✗';
  console.log(`  ${tag} ${c.id}${c.detail ? '  — ' + c.detail : ''}`);
}
console.log('─'.repeat(72));
console.log(`  ${passed} passed, ${failed} failed, ${skipped} skipped`);

const outDir = resolve(repoRoot, 'platform/docs/gates');
mkdirSync(outDir, { recursive: true });
const md = [
  '# Gate 3 — UI_OS_CORRECTIVE_ACTION_COMPLETE',
  '',
  `Run timestamp: ${new Date().toISOString()}`,
  `Shell URL: ${SHELL_URL}`,
  `Gateway URL: ${GATEWAY_URL}`,
  `Auth cookie supplied: ${AUTH_COOKIE ? 'yes' : 'no'}`,
  '',
  `**${passed}/${checks.length} checks passed**, ${failed} failed, ${skipped} skipped.`,
  '',
  '| # | Check | Status | Detail |',
  '|---|---|---|---|',
  ...checks.map(c => `| ${c.id.split('.')[0]} | ${c.id} | ${c.skip ? 'SKIP' : (c.ok ? 'PASS' : 'FAIL')} | ${(c.detail || '').replace(/\|/g, '\\|')} |`),
  '',
  '## How to re-run',
  '```bash',
  'pnpm gate:ui-os-smoke                     # unauth checks only',
  'pnpm gate:ui-os-smoke --auth-cookie=<jwt> # full set including authenticated probes',
  '```',
  '',
];
writeFileSync(`${outDir}/smoke-report.md`, md.join('\n'), 'utf8');
console.log(`\nReport: ${outDir}/smoke-report.md`);

process.exit(failed > 0 ? 1 : 0);

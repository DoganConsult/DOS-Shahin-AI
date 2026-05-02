#!/usr/bin/env node
// Preflight check for lifecycle-proof runners. Verifies everything that
// CAN be verified without live JWTs, so a fresh operator can tell whether
// the env is ready before chasing credential setup.
//
// Checks:
//   1. Gateway health (http://127.0.0.1:4000/health) returns ok.
//   2. Audit service health (http://127.0.0.1:4006/health) returns ok.
//   3. Keycloak realm reachable (well-known/openid-configuration).
//   4. DB reachable + has at least one active tenant in public.tenants.
//   5. dos.platform_audit_logs table exists.
//   6. New transition routes are mounted on the gateway (probe /api/policies/_x_/reachable-states with a fake id — expect 401, NOT 404).
//
// Usage:
//   DATABASE_URL=postgresql://... node ops/scripts/lifecycle-proofs/preflight.mjs
//
// Env (all optional; defaults match local dev):
//   GATEWAY_URL          (default http://127.0.0.1:4000)
//   AUDIT_URL            (default http://127.0.0.1:4006)
//   KEYCLOAK_URL         (default http://127.0.0.1:8180)
//   KEYCLOAK_REALM       (default dogan)
//   DATABASE_URL         (required for DB checks)

const GATEWAY = process.env.GATEWAY_URL || 'http://127.0.0.1:4000';
const AUDIT   = process.env.AUDIT_URL   || 'http://127.0.0.1:4006';
const KC      = process.env.KEYCLOAK_URL || 'http://127.0.0.1:8180';
const REALM   = process.env.KEYCLOAK_REALM || 'dogan';

// Direct service URLs (bypass gateway). The gateway's wave1-module-safety
// middleware currently 404s vendor + risk endpoints by design — those services
// pass cert at Wave-2. Until then, proof runners must hit services directly
// (or set WAVE1_MODULE_GATING_ENFORCED=false on the gateway).
const POLICY_DIRECT = process.env.POLICY_SERVICE_URL || 'http://127.0.0.1:4011';
const RISK_DIRECT   = process.env.RISK_SERVICE_URL   || 'http://127.0.0.1:4013';
const VENDOR_DIRECT = process.env.VENDOR_SERVICE_URL || 'http://127.0.0.1:4015';

const results = [];
function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✔' : '✖'} ${name}${detail ? '  — ' + detail : ''}`);
}

async function checkHealth(name, url) {
  try {
    const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) });
    const j = await r.json();
    record(`${name} /health`, r.ok && j.status === 'ok', `${r.status} ${j.service || ''}`);
  } catch (err) {
    record(`${name} /health`, false, err.message);
  }
}

async function checkKeycloakRealm() {
  try {
    const r = await fetch(`${KC}/realms/${REALM}/.well-known/openid-configuration`, {
      signal: AbortSignal.timeout(5000),
    });
    const j = await r.json();
    record(`Keycloak realm '${REALM}'`, r.ok && !!j.token_endpoint, j.token_endpoint || '');
  } catch (err) {
    record(`Keycloak realm '${REALM}'`, false, err.message);
  }
}

async function checkDb() {
  if (!process.env.DATABASE_URL) {
    record('DB connectivity', false, 'DATABASE_URL not set — skipping DB checks');
    return null;
  }
  try {
    const { default: pg } = await import('pg');
    const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await c.connect();

    const tenants = await c.query(`SELECT tenant_id, org_name FROM public.tenants WHERE status='active' LIMIT 5`);
    record('DB.public.tenants (active)', tenants.rows.length > 0, tenants.rows.map((t) => t.tenant_id).join(', '));

    // The audit-service writer targets dos.audit_logs; the activity-feed reader
    // queries dos.audit_trail. Schema drift exists in this repo. Either is
    // acceptable for proof-runner artifact capture (the runner tries both).
    const auditTables = await c.query(
      `SELECT to_regclass('dos.audit_logs') AS write_target,
              to_regclass('dos.audit_trail') AS read_target,
              to_regclass('dos.platform_audit_logs') AS legacy_target`,
    );
    const row = auditTables.rows[0];
    const haveAny = !!(row.write_target || row.read_target || row.legacy_target);
    const detail = `write=${row.write_target || '✗'}  read=${row.read_target || '✗'}  legacy=${row.legacy_target || '✗'}`;
    record('audit table available', haveAny, detail);

    return c;
  } catch (err) {
    record('DB connectivity', false, err.message);
    return null;
  }
}

async function checkRouteMount(label, baseUrl, path) {
  // Probe the transition route. 401 = auth-gated route mounted (PASS).
  // 404 = route missing (FAIL). Wave-1 gating at the gateway can produce a
  // 404 even when the service-direct path is healthy — we probe both so the
  // gating shows up explicitly without flagging the service as broken.
  try {
    const r = await fetch(`${baseUrl}${path}`, { method: 'GET', signal: AbortSignal.timeout(5000) });
    record(`${label}: GET ${path}`, r.status !== 404, `${r.status}`);
  } catch (err) {
    record(`${label}: GET ${path}`, false, err.message);
  }
}

async function main() {
  console.log(`[preflight] gateway=${GATEWAY}  audit=${AUDIT}  kc=${KC}/realms/${REALM}`);
  await checkHealth('Gateway', GATEWAY);
  await checkHealth('Audit', AUDIT);
  await checkKeycloakRealm();
  const dbClient = await checkDb();

  // Probe new lifecycle endpoints both at the gateway AND service-direct.
  // Service-direct is the source of truth (gateway can deliberately 404 via
  // wave1-module-safety middleware). Use a non-existent UUID — auth or
  // 404-on-id is fine; we only fail on 404-on-route.
  const fakeId = '00000000-0000-0000-0000-000000000000';
  await checkRouteMount('Gateway /api/policy', GATEWAY, `/api/policy/${fakeId}/reachable-states`);
  await checkRouteMount('Direct policy 4011', POLICY_DIRECT, `/api/policy/${fakeId}/reachable-states`);
  await checkRouteMount('Direct vendor 4015', VENDOR_DIRECT, `/api/vendor/${fakeId}/reachable-states`);
  await checkRouteMount('Direct risk 4013', RISK_DIRECT, `/api/risk/${fakeId}/reachable-states`);
  // Wave-1 gating note: gateway 404s vendor + risk by design.
  const gwVendor = await fetch(`${GATEWAY}/api/vendor/${fakeId}/reachable-states`, { signal: AbortSignal.timeout(5000) });
  const gwRisk = await fetch(`${GATEWAY}/api/risk/${fakeId}/reachable-states`, { signal: AbortSignal.timeout(5000) });
  console.log(`ℹ Gateway gating: /api/vendor=${gwVendor.status}  /api/risk=${gwRisk.status}  (Wave-1 module gate; set WAVE1_MODULE_GATING_ENFORCED=false to bypass)`);

  if (dbClient) await dbClient.end();

  const failures = results.filter((r) => !r.pass);
  console.log(`\n[preflight] ${failures.length === 0 ? 'PASS' : 'FAIL'} — ${results.length - failures.length}/${results.length} checks ok`);
  if (failures.length > 0) {
    console.log('\nNext steps to unblock the proof runners:');
    if (failures.some((f) => f.name.includes('Keycloak'))) {
      console.log('  • Start Keycloak (pm2 start keycloak) or set KEYCLOAK_URL.');
    }
    if (failures.some((f) => f.name.includes('Gateway') || f.name.includes('Audit'))) {
      console.log('  • Start the platform stack (pm2 start ops/ecosystem.all.config.js).');
    }
    if (failures.some((f) => f.name.includes('DB') || f.name.includes('audit_logs'))) {
      console.log('  • Apply migrations against shahin_grc DB (make migrate or ops/scripts/migration-runner.ts).');
    }
    if (failures.some((f) => f.name.startsWith('Direct'))) {
      console.log('  • Rebuild + restart governance-policy-service, vendor-service, risk-incident-service so the new transition routes mount.');
    }
    if (failures.some((f) => f.name.startsWith('Gateway'))) {
      console.log('  • Gateway path 404 may be intentional Wave-1 module gating — verify against `wave1-module-safety.middleware.ts` before declaring failure.');
    }
  }
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});

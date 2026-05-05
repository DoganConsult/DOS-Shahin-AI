/**
 * DOS Platform — canonical PM2 ecosystem (Phase 1 / Wave 0..8).
 *
 * SINGLE SOURCE OF TRUTH for what is deployed and on which port:
 *   ops/ports.allocation.json
 *
 * Boot order (PM2 has no native dependency graph, so this file lists apps
 * in wave order; ops/boot.sh implements gated start with health checks):
 *
 *   wave 0 — one-shots         : dos-migrator, keycloak-bootstrap
 *   wave 1 — core shell        : auth, tenant, user, gateway, product-shell
 *   wave 2 — runtime/dynamic   : dynamic-ui, dashboard-widgets, analytics,
 *                                notification, notification-inbox, integrations
 *   wave 3 — pillars + admin   : dos, dsoc, dnoc, admin
 *   wave 4 — AI-OS triplet     : ai-gateway, ai-engine, ai-governance,
 *                                ai-temporal-worker ×2 (commercial prod: required; Temporal must be up)
 *   wave 5 — privacy/mcp/agrc  : privacy, mcp-gateway, agrc-os
 *   wave 6 — domain GRC fleet  : workflow, audit, risk-incident,
 *                                governance-policy, evidence, executive,
 *                                onboarding, records, remediation, portals,
 *                                training, dora, asset, analytics-reporting
 *   wave 7 — overlap services  : platform-app-shell, platform-core,
 *                                platform-product, bcp, vendor
 *   wave 8 — sidecars          : registry-sync, keycloak-event-bridge,
 *                                observability stack (separate ecosystem files)
 *
 * No-delete policy (2026-04-30): every package.json+dist/server.js in the
 * monorepo is enrolled here. Overlapping services are kept on distinct ports
 * + distinct gateway prefixes (see ports.allocation.json `overlapsWith`).
 */
const path = require('path');
const fs = require('fs');

// Ecosystem now lives under platform/config-center/ops/. Repo root is 3 levels up.
const ROOT = path.resolve(__dirname, '..', '..', '..');
const ENV_DIR = path.join(ROOT, 'platform', 'config-center', 'env');
const ALLOC = JSON.parse(fs.readFileSync(path.join(ROOT, 'platform', 'config-center', 'ops', 'ports.allocation.json'), 'utf8'));

function loadEnv(name) {
  if (!name) return {};
  const file = path.join(ENV_DIR, `${name}.env`);
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}

const COMMON = { NODE_ENV: process.env.NODE_ENV || 'production', TZ: 'UTC' };
const PLATFORM_SECRETS = loadEnv('platform.secrets');

function appFromService(name, svc) {
  return {
    name,
    cwd: path.join(ROOT, svc.cwd),
    script: svc.script,
    instances: svc.instances || 1,
    exec_mode: 'fork',
    autorestart: true,
    max_memory_restart: svc.maxMemory || '1G',
    node_args: (svc.nodeArgs || '--max-old-space-size=768') + ' --no-deprecation',
    env: {
      ...COMMON,
      ...PLATFORM_SECRETS,
      ...loadEnv(svc.envFile),
      ...(svc.extraEnv || {}),
      PORT: String(svc.port),
      // Tag PG backends + log lines with the PM2 process name so the operator
      // can attribute pool exhaustion / NOAUTH / ECONNRESET to a single
      // service in pg_stat_activity (consumed by packages/dos-db/src/pool.ts).
      SERVICE_CODE: name,
    },
    // tag for boot.sh wave gating
    _wave: svc.wave,
    _optional: !!svc.optional,
    _requires: svc.requires || [],
  };
}

const apps = [];

// Wave 0 — one-shots
const migrator = ALLOC.oneShots['dos-migrator'];
apps.push({
  name: 'dos-migrator',
  cwd: ROOT,
  script: migrator.script,
  args: migrator.args,
  interpreter: 'none',
  instances: 1,
  exec_mode: 'fork',
  autorestart: false,
  max_restarts: 3,
  restart_delay: 5000,
  env: { ...COMMON, ...PLATFORM_SECRETS, ...loadEnv(migrator.envFile) },
  _wave: 0,
});

const kcBootstrap = ALLOC.oneShots['keycloak-bootstrap'];
apps.push({
  name: 'keycloak-bootstrap',
  cwd: path.join(ROOT, kcBootstrap.cwd),
  script: kcBootstrap.script,
  args: kcBootstrap.args,
  interpreter: 'none',
  instances: 1,
  exec_mode: 'fork',
  autorestart: false,
  max_restarts: 3,
  restart_delay: 5000,
  env: { ...COMMON, ...PLATFORM_SECRETS, ...loadEnv(kcBootstrap.envFile) },
  _wave: 0,
  _requires: kcBootstrap.requires,
});

// Waves 1..7 — long-running services, ordered by wave
const sortedServices = Object.entries(ALLOC.services).sort(
  (a, b) => (a[1].wave - b[1].wave) || (a[1].port - b[1].port)
);
for (const [name, svc] of sortedServices) {
  if (svc.excluded) continue;
  apps.push(appFromService(name, svc));
}

module.exports = { apps };

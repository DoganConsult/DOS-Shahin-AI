import { createServiceServer, type ModuleRegistration, loadModuleRoute } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { createEventBackbone } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { setEventBus } from '@dos/module-sdk';
import { routes } from './routes/index';
import policyRouter from './routes/policy.routes';
import { governanceDecisionsRouter } from './routes/governance-decisions.routes';
import { createComplianceMountedRouter } from './routes/compliance.mount';
import { setServiceBus } from './events/publisher';
import { registerConsumers, registerModuleConsumers } from './events/consumer';

import { createHealthRouter, dbHealthCheck, redisHealthCheck, eventBusHealthCheck } from '@dos/service-bootstrap/health';

// Health check router with DB, Redis, and EventBus probes
app.use(createHealthRouter('governance_policy', {
  db: dbHealthCheck,
  redis: redisHealthCheck,
  eventBus: eventBusHealthCheck,
}));

// Phase-12E wire-closure: Shahin policy-api.service.ts calls five hyphen-
// prefixed top-level surfaces that the FE already treats as canonical:
//   /api/policy-overview  /api/policy-exceptions  /api/policy-publications
//   /api/policy-coverage  /api/policy-reports
// Each has a real router in modules/policy/dist/policy/routes.
// Loading the compiled dist and mounting them here closes all policy-vertical
// drift without requiring any FE change. loadModuleRoute returns an empty
// Router if the compiled output is absent, so this stays safe across
// environments that haven't rebuilt the modules tree.
const policyOverviewRouter     = loadModuleRoute('policy/policy-overview',     '../../../modules/policy/dist/policy/routes/policy-overview.routes');
const policyExceptionsRouter   = loadModuleRoute('policy/policy-exception',    '../../../modules/policy/dist/policy/routes/policy-exception.routes');
const policyPublicationsRouter = loadModuleRoute('policy/policy-publication',  '../../../modules/policy/dist/policy/routes/policy-publication.routes');
const policyCoverageRouter     = loadModuleRoute('policy/policy-coverage',     '../../../modules/policy/dist/policy/routes/policy-coverage.routes');
const policyReportsRouter      = loadModuleRoute('policy/policy-reports',      '../../../modules/policy/dist/policy/routes/policy-reports.routes');

// Phase 5 (Wave 5, 2026-04-30): wire @dos/module-compliance — its 95+ HTTP
// route files in modules/compliance/interface/http/ had no host service.
// We co-host the compliance aggregator on governance-policy-service since
// (a) the same service already hosts policy + governance verticals, and
// (b) a dedicated compliance-service was never scaffolded.
// registerCompliance() returns an Express Router (with /api/compliance,
// /api/controls, /api/frameworks, /api/compliance-attestation aggregator
// mounts) that we attach as a route entry below. Bound with no deps =>
// graceful degradation (only the composite stub + health + ui-discovery
// paths are exposed); deps can be passed later as adapters land.
let complianceRouter: import('express').Router | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const compliance = require('../../../modules/compliance/dist/bootstrap');
  if (compliance && typeof compliance.registerCompliance === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const db = require('@dos/db');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dauth = require('@dos/dauth-shared');
    complianceRouter = createComplianceMountedRouter({
      registerCompliance: compliance.registerCompliance,
      db,
      dauth,
    });
  }
} catch (err) {
  console.warn('[governance-policy-service] @dos/module-compliance not loadable — skipping mount:', (err as Error).message);
}


// ── Wave 2D: Module Lifecycle Hooks ──────────────────────────────────────

async function loadModuleRegistrations(moduleCode: string): Promise<ModuleRegistration[]> {
  const registrations: ModuleRegistration[] = [];
  try {
    const modulePath = `../../../modules/${moduleCode}/source/backend/${moduleCode}/${moduleCode}.module`;
    const mod = require(modulePath);
    if (mod && typeof mod.register === 'function') {
      registrations.push({ moduleCode, register: mod.register });
    }
  } catch {
    // Module not available — service works without it
  }
  return registrations;
}

async function invokeModuleLifecycleHooks(serviceCode: string, moduleCode: string): Promise<void> {
  try {
    const modulePath = `../../../modules/${moduleCode}/source/backend/${moduleCode}/${moduleCode}.module`;
    const mod = require(modulePath);
    if (mod?.onBoot && typeof mod.onBoot === 'function') {
      await mod.onBoot();
      console.log(`[${serviceCode}] Module ${moduleCode} onBoot completed`);
    }
    if (mod?.onReady && typeof mod.onReady === 'function') {
      await mod.onReady();
      console.log(`[${serviceCode}] Module ${moduleCode} onReady completed`);
    }
  } catch (err) {
    console.warn(`[${serviceCode}] Module lifecycle hooks for ${moduleCode} failed (non-fatal):`, err);
  }

  try {
    const manifestPath = `../../../modules/${moduleCode}/source/backend/${moduleCode}/manifest/${moduleCode}.manifest`;
    const manifest = require(manifestPath);
    if (manifest?.lifecycleParticipation) {
      console.log(`[${serviceCode}] Module ${moduleCode} lifecycle participation confirmed`);
    }
  } catch {
    // Manifest not available — non-fatal
  }
}

const SERVICE_CODE = 'governance-policy-service';

async function main() {
  const config = loadServiceConfig(SERVICE_CODE);

  const eventBus = createEventBackbone({
    redisUrl: config.redis.url,
    serviceCode: SERVICE_CODE,
    logger,
  });
  setEventBus(eventBus as any);
  setServiceBus(eventBus);

  registerConsumers(eventBus);
  // Wave 2C: register module-level event subscribers
  registerModuleConsumers(eventBus);
  eventBus.startConsuming().catch((err: Error) => {
    console.error(`[${SERVICE_CODE}] Consumer error:`, err);
  });

  const { start } = await createServiceServer({
    serviceCode: SERVICE_CODE,
    port: config.port,
    routes: [
      { path: '/api/policy', router: policyRouter },
      // F1.18 / F1.19 — FE calls /api/governance/policies and
      // /api/governance/decisions. The aggregator-mount at /api does NOT
      // surface these paths (its sub-routers live under /api/governance/<name>).
      // Mount the canonical policy router and the board-decisions module
      // route explicitly at the FE-expected prefixes.
      { path: '/api/governance/policies', router: policyRouter },
      { path: '/api/governance/decisions', router: governanceDecisionsRouter },
      { path: '/api/governance-policy', router: routes },
      // V2 / Governance vertical — mount the same routes aggregator at /api
      // so the gateway prefixes (/api/governance, /api/governance-ai,
      // /api/governance-os, /api/policies, /api/board-decisions, /api/policy-*,
      // /api/proactive-leadership) reach the real module handlers. The
      // /api/governance-policy mount above is kept for backwards-compat with
      // any S2S caller that uses the aggregator shape.
      { path: '/api', router: routes },
      // Phase-12E wire-closure: hyphen-prefixed top-level policy surfaces.
      { path: '/api/policy-overview',     router: policyOverviewRouter },
      { path: '/api/policy-exceptions',   router: policyExceptionsRouter },
      { path: '/api/policy-publications', router: policyPublicationsRouter },
      { path: '/api/policy-coverage',     router: policyCoverageRouter },
      { path: '/api/policy-reports',      router: policyReportsRouter },
      // Phase 5 (Wave 5, 2026-04-30): compliance aggregator. registerCompliance()
      // returns a router with built-in mounts at /api/compliance, /api/controls,
      // /api/frameworks, /api/compliance-attestation — so we attach it at the
      // root path '/'. The wrapper's own express Router skips when null.
      ...(complianceRouter ? [{ path: '/', router: complianceRouter }] : []),
    ],
    // Wave 2D: Module lifecycle registration
    modules: await loadModuleRegistrations('governance'),
    healthChecks: {
      database: async () => {
        try {
          const { query } = await import('@dos/db');
          const result = await query('SELECT 1');
          return !!result;
        } catch { return false; }
      },
    },
    onReady: () => {
      // Wave 2D: invoke module onBoot hooks
      invokeModuleLifecycleHooks(SERVICE_CODE, 'governance').catch(() => {});
    },
  });

  await start();
}

main().catch(err => {
  console.error(`Failed to start ${SERVICE_CODE}:`, err);
  process.exit(1);
});

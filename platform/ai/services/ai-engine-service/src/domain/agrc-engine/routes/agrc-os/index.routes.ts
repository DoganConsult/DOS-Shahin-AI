// AGRC-OS — Composed router: all domain routes mounted at /api/agrc-os (no path change)

import { Router } from 'express';
import { authenticate } from '../../ports/auth.port';
import { auditMiddleware, moduleStack, automationMiddleware } from '../../ports/middleware.port';

import constitutionRoutes from './constitution.routes';
import telemetryRoutes from './telemetry.routes';
import gatesRoutes from './gates.routes';
import ccmRegulatoryOrchestrationRoutes from './ccm-regulatory-orchestration.routes';
import sopsRunbooksRoutes from './sops-runbooks.routes';
import webhooksRoutes from './webhooks.routes';
import reportingMetricsHealthRoutes from './reporting-metrics-health.routes';
import restRoutes from './rest.routes';

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('agrc-engine'));
router.use(authenticate);
router.use(auditMiddleware('agrc-os'));
router.use(automationMiddleware('agrc-os'));

router.use(constitutionRoutes);
router.use(telemetryRoutes);
router.use(gatesRoutes);
router.use(ccmRegulatoryOrchestrationRoutes);
router.use(sopsRunbooksRoutes);
router.use(webhooksRoutes);
router.use(reportingMetricsHealthRoutes);
router.use(restRoutes);

// ── Lazy-mount additional AGRC-OS routes (survive import failures) ──
const lazyAgrcMounts = async () => {
  const mounts: Array<[string, string]> = [
    ['platform-mode',       './platform-mode.routes.js'],
    ['agent-memory',        './agent-memory.routes.js'],
    ['delegation-consent',  './delegation-consent.routes.js'],
    ['dashboard-composer',  './dashboard-composer.routes.js'],
    ['role-experience',     './role-experience.routes.js'],
    ['platform-features',   './platform-features.routes.js'],
    ['agent-orchestration', './agent-orchestration.routes.js'],
    ['integration',          './integration.routes.js'],
    ['workflow-versioning',  './integration/workflow-versioning.routes.js'],
  ];
  for (const [label, mod] of mounts) {
    try {
      const m = await import(mod);
      router.use(m.default || m);
      console.log(`[agrc-os] Mounted ${label}`);
    } catch (e) { console.warn(`[agrc-os] ${label} skipped:`, (e as Error).message?.slice(0, 120)); }
  }
};
lazyAgrcMounts();

export default router;

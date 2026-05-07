// AGRC-OS — Composed router: all domain routes mounted at /api/agrc-os (no path change)
import { Router } from 'express';
import { authenticate } from '../../ports/auth.port.js';
import { auditMiddleware, moduleStack, automationMiddleware } from '../../ports/middleware.port.js';
import constitutionRoutes from './constitution.routes.js';
import telemetryRoutes from './telemetry.routes.js';
import gatesRoutes from './gates.routes.js';
import ccmRegulatoryOrchestrationRoutes from './ccm-regulatory-orchestration.routes.js';
import sopsRunbooksRoutes from './sops-runbooks.routes.js';
import webhooksRoutes from './webhooks.routes.js';
import reportingMetricsHealthRoutes from './reporting-metrics-health.routes.js';
import restRoutes from './rest.routes.js';
const router = Router();
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
    const mounts = [
        ['platform-mode', './platform-mode.routes.js'],
        ['agent-memory', './agent-memory.routes.js'],
        ['delegation-consent', './delegation-consent.routes.js'],
        ['dashboard-composer', './dashboard-composer.routes.js'],
        ['role-experience', './role-experience.routes.js'],
        ['platform-features', './platform-features.routes.js'],
        ['agent-orchestration', './agent-orchestration.routes.js'],
        ['integration', './integration.routes.js'],
        ['workflow-versioning', './integration/workflow-versioning.routes.js'],
    ];
    for (const [label, mod] of mounts) {
        try {
            const m = await import(mod);
            router.use(m.default || m);
            console.log(`[agrc-os] Mounted ${label}`);
        }
        catch (e) {
            console.warn(`[agrc-os] ${label} skipped:`, e.message?.slice(0, 120));
        }
    }
};
lazyAgrcMounts();
export default router;
//# sourceMappingURL=index.routes.js.map
import { authenticate } from '../../../ports/auth.port.js';
// AGRC-OS — Composed router: all domain routes mounted at /api/agrc-os (no path change)
import { Router } from 'express';
import { auditMiddleware, automationMiddleware } from '../../../ports/middleware.port.js';
import constitutionRoutes from '../constitution.routes.js';
import telemetryRoutes from '../telemetry.routes.js';
import gatesRoutes from '../gates.routes.js';
import ccmRegulatoryOrchestrationRoutes from '../ccm-regulatory-orchestration.routes.js';
import sopsRunbooksRoutes from '../sops-runbooks.routes.js';
import webhooksRoutes from '../webhooks.routes.js';
import reportingMetricsHealthRoutes from '../reporting-metrics-health.routes.js';
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
export default router;
//# sourceMappingURL=index.routes.js.map
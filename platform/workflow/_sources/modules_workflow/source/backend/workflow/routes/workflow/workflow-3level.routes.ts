import { authenticate } from '../../ports/auth.port';
/**
 * Workflow 3-Level routes — barrel file.
 *
 * Creates the router, applies shared middleware, and delegates to focused sub-route modules.
 * Exports default Router (consumed via route catalog with sourceKind: "defaultExport").
 */
import { Router } from 'express';
import { auditMiddleware, automationMiddleware, moduleStack, mutationEventHook } from '../../ports/middleware.port';

import { registerAiRoutes } from './workflow-3level-ai.routes';
import { registerControlsRoutes } from './workflow-3level-controls.routes';
import { registerDraftsRoutes } from './workflow-3level-drafts.routes';
import { registerInstanceOpsRoutes } from './workflow-3level-instance-ops.routes';
import { registerMonitoringRoutes } from './workflow-3level-monitoring.routes';
import { registerSupervisorRoutes } from './workflow-3level-supervisor.routes';

const router = Router();
router.use(authenticate);


// ── Shared middleware applied once at the barrel level ──
router.use(moduleStack('workflow'));
router.use(mutationEventHook('workflow'));
router.use(auditMiddleware('workflows'));
router.use(automationMiddleware('workflows'));

// ── Register route groups ──
registerAiRoutes(router);
registerControlsRoutes(router);
registerDraftsRoutes(router);
registerInstanceOpsRoutes(router);
registerMonitoringRoutes(router);
registerSupervisorRoutes(router);

export default router;

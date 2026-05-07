// AGRC-OS REST Routes — Barrel router mounting all domain sub-routers
import { Router } from 'express';
import guidedRoutes from '../guided-experience.routes.js';
import dashboardComposerRoutes from '../dashboard-composer.routes.js';
import roleExperienceRoutes from '../role-experience.routes.js';
import agentFleetRoutes from '../agent-fleet.routes.js';
import dashboardWidgetRoutes from '../../../../dashboard/routes/dashboard-widgets.routes.js';
import platformFeatureRoutes from '../platform-features.routes.js';
import { authenticate } from '../../../ports/auth.port.js';
const router = Router();
router.use(authenticate);
router.use(guidedRoutes);
router.use(dashboardComposerRoutes);
router.use(roleExperienceRoutes);
router.use(agentFleetRoutes);
router.use(dashboardWidgetRoutes);
router.use(platformFeatureRoutes);
export default router;
//# sourceMappingURL=rest.routes.js.map
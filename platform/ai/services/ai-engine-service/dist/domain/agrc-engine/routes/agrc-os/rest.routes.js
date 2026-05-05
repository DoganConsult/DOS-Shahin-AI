// AGRC-OS REST Routes — Barrel router mounting all domain sub-routers
import { Router } from 'express';
import guidedRoutes from './guided-experience.routes';
import dashboardComposerRoutes from './dashboard-composer.routes';
import roleExperienceRoutes from './role-experience.routes';
import agentFleetRoutes from './agent-fleet.routes';
import dashboardWidgetRoutes from './dashboard-widgets.routes';
import platformFeatureRoutes from './platform-features.routes';
import { authenticate } from '../../ports/auth.port';
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
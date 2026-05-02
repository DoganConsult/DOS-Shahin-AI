/**
 * AI Governance Module Controller
 *
 * Consolidates the four AI governance route files into a single module
 * controller, following the same pattern as qiyas.controller.ts.
 *
 * Sub-routers:
 *   /config  -> ai-governance-config.routes   (enforcement mode, SoD policy)
 *   /ops     -> ai-governance-ops.routes       (break-glass, promotions, health, repair)
 *   /wave1   -> ai-governance-wave1.routes     (alerts, kill switches, agent stats, drift, maturity, board)
 *   /wave2   -> ai-governance-wave2.routes     (fairness, EU AI Act, red team, ethics, impact, regulatory)
 *   (root)   -> ai-act-classification.routes  (EU AI Act classification, AIIA CRUD, scoring)
 */
import { Router } from 'express';
import { fieldRbacFilter } from './ports/middleware.port.js';

import configRoutes from './routes/ai/ai-governance-config.routes.js';
import opsRoutes from './routes/ai/ai-governance-ops.routes.js';
import wave1Routes from './routes/ai/ai-governance-wave1.routes.js';
import wave2Routes from './routes/ai/ai-governance-wave2.routes.js';
import aiActClassificationRoutes from './routes/ai/ai-act-classification.routes.js';

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();

// Apply field-level RBAC filtering for all ai-governance endpoints
router.use(fieldRbacFilter('ai-governance'));

// Mount sub-routers
router.use('/config', configRoutes);
router.use('/ops', opsRoutes);
router.use('/wave1', wave1Routes);
router.use('/wave2', wave2Routes);

// EU AI Act classification and impact assessment routes
// Mounted at root level so paths become /api/ai-governance/models/:modelId/classify etc.
router.use('/', aiActClassificationRoutes);

export default router;

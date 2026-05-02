/**
 * AI OS Services — Enterprise Hub Router
 * Routes ~70 endpoints across 6 domain sub-routers with:
 *   - Standardized response envelopes (res.ok/paginated/created/deleted)
 *   - Per-route rate limiting (read: 200/min, write: 50/min, heavy: 5/min)
 *   - Zod query param validation
 *   - Cache-Control headers (private reads, no-store writes)
 *   - Structured error classes (NotFoundError, ValidationError)
 *   - OpenAPI JSDoc annotations
 */
import { Router } from 'express';
import { auditMiddleware, moduleStack } from '../../ports/middleware.port.js';
import decisionsRoutes from './decisions.routes.js';
import policyRoutes from './policy.routes.js';
import agentsRoutes from './agents.routes.js';
import signalsRoutes from './signals.routes.js';
import operationsRoutes from './operations.routes.js';
import introspectionRoutes from './introspection.routes.js';
import kernelRoutes from './kernel.routes.js';
import codeSearchRoutes from './code-search.routes.js';
import { authenticate } from '../../ports/auth.port.js';
const router = Router();
router.use(authenticate);
// Cross-cutting middleware applied to all AI OS routes
router.use(moduleStack('ai'));
router.use(auditMiddleware('ai'));
// Domain sub-routers
router.use(decisionsRoutes);
router.use(policyRoutes);
router.use(agentsRoutes);
router.use(signalsRoutes);
router.use(operationsRoutes);
router.use(introspectionRoutes);
router.use(kernelRoutes);
router.use(codeSearchRoutes);
export default router;
//# sourceMappingURL=ai-os-services.routes.js.map
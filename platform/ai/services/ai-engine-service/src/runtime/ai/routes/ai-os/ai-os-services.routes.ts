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
import { auditMiddleware, moduleStack } from '../../ports/middleware.port';

import decisionsRoutes from './decisions.routes';
import policyRoutes from './policy.routes';
import agentsRoutes from './agents.routes';
import signalsRoutes from './signals.routes';
import operationsRoutes from './operations.routes';
import introspectionRoutes from './introspection.routes';
import kernelRoutes from './kernel.routes';
import codeSearchRoutes from './code-search.routes';
import { authenticate } from '../../ports/auth.port';
import { safeQuery } from "@dos/db";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
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

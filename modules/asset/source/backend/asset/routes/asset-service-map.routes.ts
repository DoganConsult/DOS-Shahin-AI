import { Router } from 'express';
import { z } from "zod";
import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack, fieldRbacFilter } from '../ports/middleware.port';
import { getFullServiceMap, getServiceImpact, getServiceMapStats } from '../services/service-map.service';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('asset'));
router.use(auditMiddleware('asset'));
router.use(fieldRbacFilter('asset'));

// Full service map tree
router.get('/', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const map = await getFullServiceMap(req.tenantId!);
  res.json({ data: map });
}));

// Stats overview
router.get('/stats', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const stats = await getServiceMapStats(req.tenantId!);
  res.json(stats);
}));

// Impact analysis for a service
router.get('/:serviceId/impact', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const impact = await getServiceImpact(req.tenantId!, req.params.serviceId);
  if (!impact) { res.status(404).json({ error: 'Service not found' }); return; }
  res.json(impact);
}));

export default router;

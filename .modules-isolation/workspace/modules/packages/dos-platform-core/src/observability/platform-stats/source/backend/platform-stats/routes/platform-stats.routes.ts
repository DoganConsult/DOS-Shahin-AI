// @ts-nocheck
import { Router } from 'express';
import { authenticate, requirePermission, validate, asyncHandler, setAuditData } from '../ports/platform-stats.ports';
import * as service from '../services/platform-stats.service';
import { RecordMetricSchema, QueryMetricsSchema, QueryUsageSchema } from '../schemas/platform-stats.schemas';

const router = Router();

// §6: /api/platform-stats/metrics
router.get('/metrics', authenticate, requirePermission('platform-stats.read'), asyncHandler(async (req: any, res: any) => {
  const filters = QueryMetricsSchema.parse(req.query);
  const data = await service.queryMetrics(req.tenantId, filters);
  res.json({ data });
}));

router.post('/metrics', authenticate, requirePermission('platform-stats.manage'), validate({ body: RecordMetricSchema }), asyncHandler(async (req: any, res: any) => {
  const metric = await service.recordMetric(req.tenantId, req.body);
  setAuditData(res, { action: 'create', entityType: 'platform_metric', entityId: metric.id, afterState: metric });
  res.status(201).json({ data: metric });
}));

// §6: /api/platform-stats/health
router.get('/health', authenticate, requirePermission('platform-stats.read'), asyncHandler(async (req: any, res: any) => {
  const data = await service.getSystemHealth(req.tenantId);
  res.json({ data });
}));

// §6: /api/platform-stats/usage
router.get('/usage', authenticate, requirePermission('platform-stats.read'), asyncHandler(async (req: any, res: any) => {
  const filters = QueryUsageSchema.parse(req.query);
  const data = await service.queryUsage(req.tenantId, filters);
  res.json({ data });
}));

// §6: /api/platform-stats/kpis
router.get('/kpis', authenticate, requirePermission('platform-stats.read'), asyncHandler(async (req: any, res: any) => {
  const data = await service.getKpis(req.tenantId);
  res.json({ data });
}));

// §6: /api/platform-stats/diagnostics
router.get('/diagnostics', authenticate, requirePermission('platform-stats.read'), asyncHandler(async (req: any, res: any) => {
  const data = await service.runDiagnostics(req.tenantId);
  res.json({ data });
}));

export default router;

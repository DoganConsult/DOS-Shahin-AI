import { Router, Request, Response } from 'express';
import { z } from "zod";
import { asyncHandler } from '@dos/module-sdk';
import {

  getSla,
  createSla,
  getSlasForInstance,
  detectBreaches,
  detectWarnings,
  resolveSla,
  cancelSla,
  pauseSla,
  resumeSla,
} from '../domain/workflow-sla.service';

const genericPayloadSchema = z.record(z.unknown());
import { validate } from "../ports/middleware.port";
const router = Router();

// ---------------------------------------------------------------------------
// GET /sla/:instanceId — get SLA status for a workflow instance
// ---------------------------------------------------------------------------
router.get('/:instanceId', validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }

  const instanceId = req.params['instanceId']!;
  const slas = await getSlasForInstance(instanceId, tenantId);
  res.json({ data: slas });
}));

// ---------------------------------------------------------------------------
// GET /sla/item/:slaId — get a single SLA record
// ---------------------------------------------------------------------------
router.get('/item/:slaId', validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }

  const sla = await getSla(req.params['slaId']!, tenantId);
  if (!sla) {
    res.status(404).json({ error: 'SLA not found' });
    return;
  }

  res.json({ data: sla });
}));

// ---------------------------------------------------------------------------
// POST /sla — create an SLA for a workflow instance
// ---------------------------------------------------------------------------
router.post('/', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }

  const { instanceId, stepId, slaType, targetHours, warningThresholdPct, context } = req.body;

  if (!instanceId || !slaType || !targetHours) {
    res.status(400).json({ error: 'instanceId, slaType, and targetHours are required' });
    return;
  }

  const sla = await createSla({
    tenantId,
    instanceId,
    stepId,
    slaType,
    targetHours,
    warningThresholdPct,
    context,
  });

  res.status(201).json({ data: sla });
}));

// ---------------------------------------------------------------------------
// POST /sla/:slaId/resolve — mark SLA as met
// ---------------------------------------------------------------------------
router.post('/:slaId/resolve', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }

  const sla = await resolveSla(req.params['slaId']!, tenantId);
  if (!sla) {
    res.status(404).json({ error: 'SLA not found' });
    return;
  }

  res.json({ data: sla });
}));

// ---------------------------------------------------------------------------
// POST /sla/:slaId/cancel
// ---------------------------------------------------------------------------
router.post('/:slaId/cancel', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }

  const sla = await cancelSla(req.params['slaId']!, tenantId);
  if (!sla) {
    res.status(404).json({ error: 'SLA not found' });
    return;
  }

  res.json({ data: sla });
}));

// ---------------------------------------------------------------------------
// POST /sla/:slaId/pause
// ---------------------------------------------------------------------------
router.post('/:slaId/pause', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }

  const sla = await pauseSla(req.params['slaId']!, tenantId);
  if (!sla) {
    res.status(404).json({ error: 'SLA not found' });
    return;
  }

  res.json({ data: sla });
}));

// ---------------------------------------------------------------------------
// POST /sla/:slaId/resume
// ---------------------------------------------------------------------------
router.post('/:slaId/resume', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }

  const sla = await resumeSla(req.params['slaId']!, tenantId);
  if (!sla) {
    res.status(404).json({ error: 'SLA not found' });
    return;
  }

  res.json({ data: sla });
}));

// ---------------------------------------------------------------------------
// POST /sla/detect-breaches — run breach detection (admin/cron)
// ---------------------------------------------------------------------------
router.post('/detect-breaches', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string | undefined;
  const breaches = await detectBreaches(tenantId);
  res.json({ data: breaches, count: breaches.length });
}));

// ---------------------------------------------------------------------------
// POST /sla/detect-warnings — run warning detection (admin/cron)
// ---------------------------------------------------------------------------
router.post('/detect-warnings', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string | undefined;
  const warnings = await detectWarnings(tenantId);
  res.json({ data: warnings, count: warnings.length });
}));

export default router;


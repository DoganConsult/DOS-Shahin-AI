import { Router, Request, Response } from 'express';
import { z } from "zod";
import { asyncHandler } from '@dos/module-sdk';
import {

  registerScheduledJob,
  listScheduledJobs,
  triggerScheduledJob,
  deactivateScheduledJob,
} from '../domain/schedule.service';

const genericPayloadSchema = z.record(z.unknown());
import { validate } from "../ports/middleware.port";
const router = Router();

router.post('/', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }
  const { name, cronExpression, jobType, payload, createdBy } = req.body;
  if (!name || !cronExpression || !jobType) {
    res.status(400).json({ error: 'name, cronExpression, and jobType are required' });
    return;
  }
  const job = await registerScheduledJob({ tenantId, name, cronExpression, jobType, payload, createdBy });
  res.status(201).json({ data: job });
}));

router.get('/', validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }
  const limit = parseInt(req.query['limit'] as string || '50', 10);
  const offset = parseInt(req.query['offset'] as string || '0', 10);
  const active = req.query['active'] !== undefined ? req.query['active'] === 'true' : undefined;
  const result = await listScheduledJobs({ tenantId, limit, offset, active });
  res.json({ data: result.data, total: result.total });
}));

router.post('/:id/trigger', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }
  const { triggeredBy } = req.body;
  const job = await triggerScheduledJob(req.params['id']!, tenantId, triggeredBy);
  if (!job) {
    res.status(404).json({ error: 'Scheduled job not found' });
    return;
  }
  res.json({ data: job });
}));

router.patch('/:id/deactivate', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }
  const job = await deactivateScheduledJob(req.params['id']!, tenantId);
  if (!job) {
    res.status(404).json({ error: 'Scheduled job not found' });
    return;
  }
  res.json({ data: job });
}));

export default router;


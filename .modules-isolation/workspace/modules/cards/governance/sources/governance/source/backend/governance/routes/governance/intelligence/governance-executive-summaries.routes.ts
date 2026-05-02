import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../../ports/auth.port';
import { emitEvent } from '../../../ports/events.port';
import * as execSummaryService from '../../../services/governance/governance-executive-summaries.service';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

/** Zod schemas for request body validation */
const createSummaryBody = z.object({}).passthrough();

const updateSummaryBody = z.object({}).passthrough();

const generateSummaryBody = z.object({}).passthrough();

import { asyncHandler, validate, auditMiddleware, setAuditData, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';
import { createApproveBody, createPublishBody } from '../../../schemas/governance.schemas';
import { genericGovernanceSchema } from "../../../schemas/governance.schemas";

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware("governance"));

router.get('/', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await execSummaryService.listSummaries(req.tenantId, {
  status: req.query.status as string,
  summary_type: req.query.summary_type as string,
  });
  res.json(result);
}));

router.get('/:id', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await execSummaryService.getSummaryById(req.tenantId, req.params.id);
  if (!result) return res.status(404).json({ error: 'Executive summary not found' });
  res.json(result);
}));

router.post('/', authenticate, requirePermission('governance.record.write'), validate({ body: createSummaryBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const result = await execSummaryService.createSummary(tenantId, req.body, userId);
  setAuditData(res as any, { action: 'create', entityType: 'governance_executive_summary', entityId: result.summary_id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'governance', event: 'created', entityType: 'governance_executive_summary', entityId: result.summary_id } as any)), { tenantId: tenantId, operation: 'grcEvent:governance.governance_executive_summary.created' });
  res.status(201).json(result);
}));

router.put('/:id', authenticate, requirePermission('governance.record.write'), validate({ body: updateSummaryBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const result = await execSummaryService.updateSummary(tenantId, req.params.id, req.body);
  if (!result) return res.status(404).json({ error: 'Executive summary not found' });
  setAuditData(res as any, { action: 'update', entityType: 'governance_executive_summary', entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'governance', event: 'updated', entityType: 'governance_executive_summary', entityId: req.params.id } as any)), { tenantId: tenantId, operation: 'grcEvent:governance.governance_executive_summary.updated' });
  res.json(result);
}));

router.post('/:id/approve', authenticate, requirePermission('governance.record.write'), validate({ body: createApproveBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const result = await execSummaryService.approveSummary(tenantId, req.params.id, userId);
  if (!result) return res.status(404).json({ error: 'Executive summary not found' });
  setAuditData(res as any, { action: 'update', entityType: 'governance_executive_summary', entityId: req.params.id, afterState: { status: 'approved' } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'governance', event: 'approved', entityType: 'governance_executive_summary', entityId: req.params.id } as any)), { tenantId: tenantId, operation: 'grcEvent:governance.governance_executive_summary.approved' });
  res.json(result);
}));

router.post('/:id/publish', authenticate, requirePermission('governance.record.write'), validate({ body: createPublishBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const result = await execSummaryService.publishSummary(tenantId, req.params.id);
  if (!result) return res.status(400).json({ error: 'Summary must be approved before publishing' });
  setAuditData(res as any, { action: 'update', entityType: 'governance_executive_summary', entityId: req.params.id, afterState: { status: 'published' } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'governance', event: 'published', entityType: 'governance_executive_summary', entityId: req.params.id } as any)), { tenantId: tenantId, operation: 'grcEvent:governance.governance_executive_summary.published' });
  res.json(result);
}));

router.post('/generate', authenticate, requirePermission('governance.record.write'), validate({ body: generateSummaryBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const result = await execSummaryService.generateSummary(tenantId, req.body, userId);
  setAuditData(res as any, { action: 'create', entityType: 'governance_executive_summary', entityId: result.summary_id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'governance', event: 'generated', entityType: 'governance_executive_summary', entityId: result.summary_id } as any)), { tenantId: tenantId, operation: 'grcEvent:governance.governance_executive_summary.generated' });
  res.status(201).json(result);
}));

router.delete('/:id', authenticate, requirePermission('governance.record.delete'), validate({ body: genericGovernanceSchema }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const result = await execSummaryService.deleteSummary(tenantId, req.params.id);
  if (!result) return res.status(404).json({ error: 'Executive summary not found' });
  setAuditData(res as any, { action: 'delete', entityType: 'governance_executive_summary', entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'governance', event: 'deleted', entityType: 'governance_executive_summary', entityId: req.params.id } as any)), { tenantId: tenantId, operation: 'grcEvent:governance.governance_executive_summary.deleted' });
  res.json({ deleted: true });
}));

export default router;


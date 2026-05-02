import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  registerDriftRule, listDriftRules, runDriftScan,
  getDriftDashboard, listDriftEvents, acknowledgeDrift, resolveDrift,
} from '../../services/compliance/compliance-drift-engine.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { asyncHandler, auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { registerDriftRuleBody, runDriftScanBody, createAcknowledgeBody, createResolveBody } from "../../../schemas/compliance.schemas";

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware('compliance'));
router.use(automationMiddleware('compliance'));

// GET /rules — list drift rules
router.get('/rules', authenticate, requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { category, severity, is_active } = req.query as Record<string, string | undefined>;
  const data = await listDriftRules(tenantId, { category, severity, isActive: is_active === 'true' ? true : is_active === 'false' ? false : undefined });
  res.json({ data });
}));

// POST /rules — register drift rule
router.post('/rules', authenticate, requirePermission('compliance.program.write'), validate({ body: registerDriftRuleBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const result = await registerDriftRule(tenantId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'drift_rule', entityId: result.ruleId, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'created', entityType: 'drift_rule', entityId: result.ruleId } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.drift_rule.created' });
  res.status(201).json(result);
}));

// POST /scan — run drift scan
router.post('/scan', authenticate, requirePermission('compliance.program.write'), validate({ body: runDriftScanBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const result = await runDriftScan(tenantId, req.body.category);
  setAuditData(res as any, { action: 'create', entityType: 'drift_scan', entityId: 'scan', afterState: { eventsDetected: result.eventsDetected } });
  res.json(result);
}));

// GET /dashboard — drift dashboard metrics
router.get('/dashboard', authenticate, requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await getDriftDashboard(tenantId);
  res.json(data);
}));

// GET /events — list drift events
router.get('/events', authenticate, requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { status, severity, rule_id } = req.query as Record<string, string | undefined>;
  const data = await listDriftEvents(tenantId, { status, severity, ruleId: rule_id });
  res.json({ data });
}));

// POST /events/:eventId/acknowledge — acknowledge drift event
router.post('/events/:eventId/acknowledge', authenticate, requirePermission('compliance.program.write'), validate({ body: createAcknowledgeBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  await acknowledgeDrift(tenantId, req.params.eventId, userId);
  setAuditData(res as any, { action: 'update', entityType: 'drift_event', entityId: req.params.eventId, afterState: { status: 'acknowledged' } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'compliance', event: 'updated', entityType: 'drift_event', entityId: req.params.eventId } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.drift_event.updated' });
  res.json({ success: true });
}));

// POST /events/:eventId/resolve — resolve drift event
router.post('/events/:eventId/resolve', authenticate, requirePermission('compliance.program.write'), validate({ body: createResolveBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  await resolveDrift(tenantId, req.params.eventId, userId);
  setAuditData(res as any, { action: 'update', entityType: 'drift_event', entityId: req.params.eventId, afterState: { status: 'resolved' } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'compliance', event: 'updated', entityType: 'drift_event', entityId: req.params.eventId } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.drift_event.updated' });
  res.json({ success: true });
}));

export default router;


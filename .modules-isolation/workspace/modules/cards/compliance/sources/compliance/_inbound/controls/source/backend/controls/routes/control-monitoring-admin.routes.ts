import { Request, Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
// ============================================
// AGRC-OS — Control Monitoring Admin Routes
// CRUD for monitoring rules, alert management,
// and monitoring signal feeds.
// ============================================


import { authenticate, requirePermission, setAuditData } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, automationMiddleware, fieldRbacFilter, validate } from '../ports/middleware.port';
import { z } from "zod";
import { ControlMonitoringAdminService } from "../services/control-monitoring-admin.service";
import { createRuleBody, updateRuleBody, createAcknowledgeBody } from "../schemas/controls.schemas";

const genericPayloadSchema = z.record(z.unknown());

const router = Router();

/**
 * GET /api/controls/monitoring/rules
 *
 * List all monitoring rules.
 */
router.get(
  "/rules",
  authenticate,
  requirePermission("control.record.read"),
  fieldRbacFilter("control"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const svc = new ControlMonitoringAdminService();
    const result = await svc.listRules(tenantId);
    res.json(result);
  })
);

/**
 * POST /api/controls/monitoring/rules
 *
 * Create a new monitoring rule.
 */
router.post(
  "/rules",
  authenticate,
  requirePermission("controls.monitor"),
  validate({ body: createRuleBody }),
  auditMiddleware("controls"),
  automationMiddleware("controls"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const _createdBy = req.user?.userId || req.user!.userId!;
    const svc = new ControlMonitoringAdminService();
    const result = await svc.createRule(tenantId, req.body);
    setAuditData(res as any, { action: 'create', entityType: 'control_monitoring_rule', entityId: (result as any)?.id || 'new', afterState: result });
    res.status(201).json(result);
  })
);

/**
 * PUT /api/controls/monitoring/rules/:ruleId
 *
 * Update an existing monitoring rule.
 */
router.put(
  "/rules/:ruleId",
  authenticate,
  requirePermission("controls.monitor"),
  validate({ body: updateRuleBody }),
  auditMiddleware("controls"),
  automationMiddleware("controls"),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { ruleId } = req.params;
    const svc = new ControlMonitoringAdminService();
    const result = await svc.updateRule(tenantId, ruleId, req.body);
    setAuditData(res as any, { action: 'update', entityType: 'control_monitoring_rule', entityId: ruleId, afterState: result });
    res.json(result);
  })
);

/**
 * DELETE /api/controls/monitoring/rules/:ruleId
 *
 * Delete a monitoring rule.
 */
router.delete(
  "/rules/:ruleId",
  authenticate,
  requirePermission("controls.monitor"),
  auditMiddleware("controls"),
  automationMiddleware("controls"), validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { ruleId } = req.params;
    const svc = new ControlMonitoringAdminService();
    await svc.deleteRule(tenantId, ruleId);
    setAuditData(res as any, { action: 'delete', entityType: 'control_monitoring_rule', entityId: ruleId });
    res.status(204).send();
  })
);

/**
 * GET /api/controls/monitoring/alerts
 *
 * List monitoring alerts with optional status/severity filters.
 */
router.get(
  "/alerts",
  authenticate,
  requirePermission("control.record.read"),
  fieldRbacFilter("control"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const svc = new ControlMonitoringAdminService();
    const result = await svc.listAlerts(tenantId);
    res.json(result);
  })
);

/**
 * POST /api/controls/monitoring/alerts/:alertId/acknowledge
 *
 * Acknowledge a monitoring alert.
 */
router.post(
  "/alerts/:alertId/acknowledge",
  authenticate,
  requirePermission("controls.monitor"),
  auditMiddleware("controls"),
  automationMiddleware("controls"),
  validate({ body: createAcknowledgeBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { alertId } = req.params;
    const acknowledgedBy = req.user?.userId || req.user!.userId!;
    const svc = new ControlMonitoringAdminService();
    const result = await svc.acknowledgeAlert(tenantId, alertId, acknowledgedBy);
    setAuditData(res as any, { action: 'acknowledge', entityType: 'control_monitoring_alert', entityId: alertId, afterState: result });
    res.json(result);
  })
);

/**
 * GET /api/controls/monitoring/signals
 *
 * List recent monitoring signals (raw signal feed).
 */
router.get(
  "/signals",
  authenticate,
  requirePermission("control.record.read"),
  fieldRbacFilter("control"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const _tenantId = req.tenantId;
    // Signal feed not yet implemented in service layer; return empty array
    res.json([]);
  })
);

export default router;

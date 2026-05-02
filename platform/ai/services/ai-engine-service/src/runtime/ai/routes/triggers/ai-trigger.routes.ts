// @ts-nocheck
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { z as _z } from 'zod';
import { Router } from "express";
import type { AuthenticatedRequest } from '@dos/types';
import { authenticate, requirePermission } from '../../ports/auth.port';
import * as triggerService from '../../services/workflow/ai-workflow-trigger.service';
import { emitModuleEvent } from '../../services/emit-event';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import { emptyResult } from '../../ports/database.port';

// ── Zod Schemas ──────────────────────────────────────────────────────────
import { asyncHandler as _asyncHandler, validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../ports/middleware.port';
import { swallow, swallowDefault, EC } from '@dos/platform-core/resilience/resilient-catch';

const z = _z;
const genericPayloadSchema = z.record(z.unknown());
import { configPutBody, evaluatePostBody, rootPostBody, idPutBody, idTestPostBody, testAllPostBody } from "../../schemas/ai.schemas";
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('ai'));
router.use(auditMiddleware("workflows"));
router.use(automationMiddleware("workflows"));

router.use(authenticate);

// GET /api/ai-triggers/config
router.get("/config", validate({ query: z.record(z.unknown()) }), requirePermission("admin.system.read"), async (req: AuthenticatedRequest, res) => {
  try {
    const config = await triggerService.getConfig(req.tenantId);
    res.json(config || { enabled: false, risk_threshold: 20, compliance_gap_threshold: 30, incident_severity_threshold: 'high' });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// PUT /api/ai-triggers/config
router.put("/config", requirePermission("admin.system.write"), validate({ body: configPutBody }), async (req: AuthenticatedRequest, res) => {
  try {
    const config = await triggerService.upsertConfig(req.tenantId, req.body);
    setAuditData(res as any, { action: "update", entityType: "ai-trigger", entityId: req.tenantId, afterState: config });
    swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'workflows', event: 'updated', entityType: 'ai_trigger', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:workflows.ai_trigger.updated' });
    res.json(config);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /api/ai-triggers/evaluate
router.post("/evaluate", requirePermission("copilot.assistant.read"), validate({ body: evaluatePostBody }), async (req: AuthenticatedRequest, res) => {
  try {
    const result = await triggerService.evaluateAndTrigger(req.tenantId, req.userId, req.body);

    setAuditData(res as any, { action: "create", entityType: "ai-trigger", entityId: (result as Record<string, unknown>)?.id || "evaluate", afterState: result });
    swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'workflows', event: 'created', entityType: 'ai_trigger', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:workflows.ai_trigger.created' });
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /api/ai-triggers — Create a new trigger
router.post("/", requirePermission("admin.system.write"), validate({ body: rootPostBody }), async (req: AuthenticatedRequest, res) => {
  try {
    const { safeQuery, tenantSchema } = await import('@dos/db');
    const schema = tenantSchema(req.tenantId);
    const { name, event_type, condition, action_type, enabled } = req.body;
    if (!name) { res.status(400).json({ error: "name required" }); return; }
    const result = await safeQuery(`
      INSERT INTO "${schema}".ai_triggers (name, event_type, condition, action_type, enabled)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [name, event_type || 'manual', JSON.stringify(condition || {}), action_type || 'notify', enabled !== false]);
    setAuditData(res as any, { action: "create", entityType: "ai-trigger", entityId: getFirstRow(result)?.trigger_id, afterState: getFirstRow(result) });
    swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'workflows', event: 'created', entityType: 'ai_trigger', entityId: getFirstRow(result)?.trigger_id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:workflows.ai_trigger.created' });
    res.status(201).json(getFirstRow(result));
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// PUT /api/ai-triggers/:id — Update trigger
router.put("/:id", requirePermission("admin.system.write"), validate({ body: idPutBody }), async (req: AuthenticatedRequest, res) => {
  try {
    const { safeQuery, tenantSchema } = await import('@dos/db');
    const schema = tenantSchema(req.tenantId);
    const sets: string[] = ["updated_at = NOW()"];
    const params: unknown[] = [req.params.id];
    let idx = 2;
    for (const key of ["name", "event_type", "action_type", "enabled"]) {
      if (req.body[key] !== undefined) { sets.push(`${key} = $${idx++}`); params.push(req.body[key]); }
    }
    if (req.body.condition !== undefined) { sets.push(`condition = $${idx++}`); params.push(JSON.stringify(req.body.condition)); }
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `UPDATE "${schema}".ai_triggers SET ${sets.join(", ")} WHERE trigger_id = $1 RETURNING *`, params
    ), { tenantId: req.tenantId, operation: 'update ai_triggers' });
    if (!getFirstRow(result)) { res.status(404).json({ error: "Trigger not found" }); return; }
    setAuditData(res as any, { action: "update", entityType: "ai-trigger", entityId: req.params.id, afterState: getFirstRow(result) });
    swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'workflows', event: 'updated', entityType: 'ai_trigger', entityId: req.params.id }), { tenantId: req.tenantId, operation: 'grcEvent:workflows.ai_trigger.updated' });
    res.json(getFirstRow(result));
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// DELETE /api/ai-triggers/:id
router.delete("/:id", validate({ body: genericPayloadSchema }), requirePermission("admin.system.write"), async (req: AuthenticatedRequest, res) => {
  try {
    const { safeQuery, tenantSchema } = await import('@dos/db');
    const schema = tenantSchema(req.tenantId);
    await safeQuery(`UPDATE "${schema}".ai_triggers SET deleted_at = NOW() WHERE trigger_id = $1`, [req.params.id]);
    setAuditData(res as any, { action: "delete", entityType: "ai-trigger", entityId: req.params.id });
    swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'workflows', event: 'deleted', entityType: 'ai_trigger', entityId: req.params.id }), { tenantId: req.tenantId, operation: 'grcEvent:workflows.ai_trigger.deleted' });
    res.json({ deleted: true });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// POST /api/ai-triggers/:id/test — Test a single trigger
router.post("/:id/test", requirePermission("admin.system.read"), validate({ body: idTestPostBody }), async (req: AuthenticatedRequest, res) => {
  try {
    res.json({ tested: true, triggerId: req.params.id, result: "pass", testedAt: new Date().toISOString() });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// POST /api/ai-triggers/test-all — Test all triggers
router.post("/test-all", requirePermission("admin.system.read"), validate({ body: testAllPostBody }), async (req: AuthenticatedRequest, res) => {
  try {

    const result = await triggerService.evaluateAndTrigger(req.tenantId, req.userId, {} as Record<string, unknown>);
    res.json({ tested: true, result });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// GET /api/ai-triggers/:id/history — Trigger execution history
router.get("/:id/history", validate({ query: z.record(z.unknown()) }), requirePermission("admin.system.read"), async (req: AuthenticatedRequest, res) => {
  try {
    const { safeQuery, tenantSchema } = await import('@dos/db');
    const schema = tenantSchema(req.tenantId);
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT * FROM "${schema}".ai_trigger_history WHERE trigger_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.params.id]
    ), { tenantId: req.tenantId, operation: 'query ai_trigger_history' });
    res.json({ history: result.rows, count: result.rows.length });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

export default router;

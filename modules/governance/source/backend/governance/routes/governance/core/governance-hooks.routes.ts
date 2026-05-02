import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../../ports/auth.port';
import { safeQuery, tenantSchema, assertTenantId } from '../../../ports/database.port';
import { getBoardWatchlist } from '../../../services/governance/governance-health.service';
import { emitEvent } from '../../../ports/events.port';
import { getFirstRow } from '../../../../../utils/db-utils';

/** Zod schemas for request body validation */
const fromRiskBody = z.object({
  risk_id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.string().optional(),
}).passthrough();

const fromAuditFindingBody = z.object({
  finding_id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.string().optional(),
  board_attention: z.boolean().optional(),
}).passthrough();

const fromComplianceGapBody = z.object({
  gap_id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.string().optional(),
}).passthrough();

const fromIncidentBody = z.object({
  incident_id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.string().optional(),
  board_attention: z.boolean().optional(),
}).passthrough();

const fromControlFailureBody = z.object({
  control_id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.string().optional(),
}).passthrough();

import { validate, auditMiddleware, setAuditData, asyncHandler, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware("governance"));

router.post('/from-risk', authenticate, requirePermission('governance.record.write'), validate({ body: fromRiskBody }), asyncHandler(async (req: Request, res: Response) => {
  assertTenantId(req.tenantId);
  const schema = tenantSchema(req.tenantId);
  const { risk_id, title, description, assigned_to, due_date, priority } = req.body;
  if (!risk_id || !title) { res.status(400).json({ error: 'risk_id and title required' }); return; }
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_action_items (title, description, assigned_to, due_date, priority, source_type, source_id, created_by)
     VALUES ($1,$2,$3,$4,$5,'risk',$6,$7) RETURNING *`,
    [title, description || `Action from risk ${risk_id}`, assigned_to || req.user?.userId, due_date, priority || 'medium', risk_id, req.user?.userId]
  );
  setAuditData(res as any, { action: 'create', entityType: 'governance_action_item', entityId: getFirstRow(result)?.action_id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_action_item', entityId: getFirstRow(result)?.action_id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_action_item.created' });
  res.status(201).json(getFirstRow(result));
}));

router.post('/from-audit-finding', authenticate, requirePermission('governance.record.write'), validate({ body: fromAuditFindingBody }), asyncHandler(async (req: Request, res: Response) => {
  assertTenantId(req.tenantId);
  const schema = tenantSchema(req.tenantId);
  const { finding_id, title, description, assigned_to, due_date, priority, board_attention } = req.body;
  if (!finding_id || !title) { res.status(400).json({ error: 'finding_id and title required' }); return; }
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_action_items (title, description, assigned_to, due_date, priority, source_type, source_id, board_attention, created_by)
     VALUES ($1,$2,$3,$4,$5,'audit_finding',$6,$7,$8) RETURNING *`,
    [title, description || `Action from audit finding ${finding_id}`, assigned_to || req.user?.userId, due_date, priority || 'high', finding_id, board_attention || false, req.user?.userId]
  );
  setAuditData(res as any, { action: 'create', entityType: 'governance_action_item', entityId: getFirstRow(result)?.action_id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_action_item', entityId: getFirstRow(result)?.action_id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_action_item.created' });
  res.status(201).json(getFirstRow(result));
}));

router.post('/from-compliance-gap', authenticate, requirePermission('governance.record.write'), validate({ body: fromComplianceGapBody }), asyncHandler(async (req: Request, res: Response) => {
  assertTenantId(req.tenantId);
  const schema = tenantSchema(req.tenantId);
  const { gap_id, title, description, assigned_to, due_date, priority } = req.body;
  if (!gap_id || !title) { res.status(400).json({ error: 'gap_id and title required' }); return; }
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_action_items (title, description, assigned_to, due_date, priority, source_type, source_id, created_by)
     VALUES ($1,$2,$3,$4,$5,'compliance_gap',$6,$7) RETURNING *`,
    [title, description || `Action from compliance gap ${gap_id}`, assigned_to || req.user?.userId, due_date, priority || 'medium', gap_id, req.user?.userId]
  );
  setAuditData(res as any, { action: 'create', entityType: 'governance_action_item', entityId: getFirstRow(result)?.action_id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_action_item', entityId: getFirstRow(result)?.action_id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_action_item.created' });
  res.status(201).json(getFirstRow(result));
}));

router.post('/from-incident', authenticate, requirePermission('governance.record.write'), validate({ body: fromIncidentBody }), asyncHandler(async (req: Request, res: Response) => {
  assertTenantId(req.tenantId);
  const schema = tenantSchema(req.tenantId);
  const { incident_id, title, description, assigned_to, due_date, priority, board_attention } = req.body;
  if (!incident_id || !title) { res.status(400).json({ error: 'incident_id and title required' }); return; }
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_action_items (title, description, assigned_to, due_date, priority, source_type, source_id, board_attention, created_by)
     VALUES ($1,$2,$3,$4,$5,'incident',$6,$7,$8) RETURNING *`,
    [title, description || `Action from incident ${incident_id}`, assigned_to || req.user?.userId, due_date, priority || 'critical', incident_id, board_attention || true, req.user?.userId]
  );
  setAuditData(res as any, { action: 'create', entityType: 'governance_action_item', entityId: getFirstRow(result)?.action_id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_action_item', entityId: getFirstRow(result)?.action_id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_action_item.created' });
  res.status(201).json(getFirstRow(result));
}));

router.post('/from-control-failure', authenticate, requirePermission('governance.record.write'), validate({ body: fromControlFailureBody }), asyncHandler(async (req: Request, res: Response) => {
  assertTenantId(req.tenantId);
  const schema = tenantSchema(req.tenantId);
  const { control_id, title, description, assigned_to, due_date, priority } = req.body;
  if (!control_id || !title) { res.status(400).json({ error: 'control_id and title required' }); return; }
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_action_items (title, description, assigned_to, due_date, priority, source_type, source_id, created_by)
     VALUES ($1,$2,$3,$4,$5,'control_failure',$6,$7) RETURNING *`,
    [title, description || `Action from control failure ${control_id}`, assigned_to || req.user?.userId, due_date, priority || 'high', control_id, req.user?.userId]
  );
  setAuditData(res as any, { action: 'create', entityType: 'governance_action_item', entityId: getFirstRow(result)?.action_id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_action_item', entityId: getFirstRow(result)?.action_id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_action_item.created' });
  res.status(201).json(getFirstRow(result));
}));

router.get('/actions-by-source', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  assertTenantId(req.tenantId);
  const schema = tenantSchema(req.tenantId);
  const { source_type, source_id } = req.query;
  let sql = `SELECT * FROM "${schema}".governance_action_items WHERE deleted_at IS NULL`;
  const params: unknown[] = [];
  if (source_type) { params.push(source_type); sql += ` AND source_type = $${params.length}`; }
  if (source_id) { params.push(source_id); sql += ` AND source_id = $${params.length}`; }
  sql += ' ORDER BY created_at DESC';
  const result = await safeQuery(sql, params);
  res.json({ actions: result.rows, count: result.rows.length });
}));

router.get('/source-summary', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  assertTenantId(req.tenantId);
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(
    `SELECT source_type, status, COUNT(*)::int AS count FROM "${schema}".governance_action_items WHERE deleted_at IS NULL AND source_type IS NOT NULL GROUP BY source_type, status ORDER BY source_type, status`
  );
  res.json({ summary: result.rows });
}));

router.get('/board-attention', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  assertTenantId(req.tenantId);
  const items = await getBoardWatchlist(req.tenantId);
  res.json({ items, count: items.length });
}));

export default router;


import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../ports/auth.port';
import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import { asyncHandler, validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../ports/middleware.port';
import { swallow, swallowDefault, EC } from '@dos/platform-core/resilience';
import { createCodeOfConductBody, createDisclosureBody, createEthicsReportBody, updateEthicsReportBody, createEthicsActionBody, updateEthicsActionBody } from "../../schemas/governance.schemas";
import { genericGovernanceSchema } from "../../schemas/governance.schemas";

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware("ethics"));
router.use(automationMiddleware("governance"));

router.get("/", authenticate, requirePermission("policy.document.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const statusFilter = req.query.status as string;
  const where = statusFilter ? `AND status = $1` : '';
  const params = statusFilter ? [statusFilter] : [];
  const result = await safeQuery(`
  SELECT * FROM "${schema}".ethics_reports
  WHERE deleted_at IS NULL ${where}
  ORDER BY created_at DESC
  `, params);
  res.json({ reports: result.rows, count: result.rows.length });
}));

router.get("/dashboard", authenticate, requirePermission("policy.document.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const [openRes, severityRes, categoryRes, recentRes] = await Promise.all([
  swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
  SELECT status, COUNT(*)::int AS count FROM "${schema}".ethics_reports
  WHERE deleted_at IS NULL GROUP BY status
  `), { tenantId: req.tenantId!, operation: 'query ethics_reports' }),
  swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
  SELECT severity, COUNT(*)::int AS count FROM "${schema}".ethics_reports
  WHERE deleted_at IS NULL AND status NOT IN ('resolved', 'closed') GROUP BY severity
  `), { tenantId: req.tenantId!, operation: 'query ethics_reports' }),
  swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
  SELECT category, COUNT(*)::int AS count FROM "${schema}".ethics_reports
  WHERE deleted_at IS NULL GROUP BY category ORDER BY count DESC LIMIT 10
  `), { tenantId: req.tenantId!, operation: 'query ethics_reports' }),
  swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
  SELECT * FROM "${schema}".ethics_reports
  WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 10
  `), { tenantId: req.tenantId!, operation: 'query ethics_reports' }),
  ]);
  const statusCounts: Record<string, number> = {};

  for (const r of openRes.rows) statusCounts[(r as any).status] = r.count;
  const severityCounts: Record<string, number> = {};

  for (const r of severityRes.rows) severityCounts[(r as any).severity] = r.count;
  res.json({
  statusCounts,
  severityCounts,
  categories: categoryRes.rows,
  recentReports: recentRes.rows,
  counts: {
  total: Object.values(statusCounts).reduce((a: number, b: number) => a + b, 0),
  open: (statusCounts['reported'] || 0) + (statusCounts['investigating'] || 0),
  resolved: statusCounts['resolved'] || 0,
  },
  });
}));

// GET /api/governance/ethics/code-of-conduct
router.get("/code-of-conduct", authenticate, requirePermission("policy.document.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
  `SELECT * FROM "${schema}".ethics_reports WHERE report_type = 'code_of_conduct' AND deleted_at IS NULL ORDER BY created_at DESC`
  ), { tenantId: req.tenantId!, operation: 'query ethics_reports' });
  res.json({ items: result.rows, count: result.rows.length });
}));

// POST /api/governance/ethics/code-of-conduct
router.post("/code-of-conduct", authenticate, requirePermission("policy.document.write"), validate({ body: createCodeOfConductBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const { title_en, title_ar, owner, effective_date } = req.body;
  if (!title_en) { res.status(400).json({ error: "title_en required" }); return; }
  const result = await safeQuery(`
  INSERT INTO "${schema}".ethics_reports (title, description, report_type, severity, category)
  VALUES ($1, $2, 'code_of_conduct', 'low', 'code_of_conduct') RETURNING *
  `, [title_en, JSON.stringify({ title_ar, owner, effective_date })]);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'ethics_governance', entityId: getFirstRow(result)?.report_id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.ethics_governance.created' });
  res.status(201).json(getFirstRow(result));
}));

// GET /api/governance/ethics/disclosures
router.get("/disclosures", authenticate, requirePermission("policy.document.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
  `SELECT * FROM "${schema}".ethics_reports WHERE report_type = 'disclosure' AND deleted_at IS NULL ORDER BY created_at DESC`
  ), { tenantId: req.tenantId!, operation: 'query ethics_reports' });
  res.json({ items: result.rows, count: result.rows.length });
}));

// POST /api/governance/ethics/disclosures
router.post("/disclosures", authenticate, requirePermission("policy.document.write"), validate({ body: createDisclosureBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const { disclosure_type, discloser_name, description } = req.body;
  if (!discloser_name) { res.status(400).json({ error: "discloser_name required" }); return; }
  const result = await safeQuery(`
  INSERT INTO "${schema}".ethics_reports (title, description, report_type, severity, category)
  VALUES ($1, $2, 'disclosure', 'low', $3) RETURNING *
  `, [discloser_name, description || '', disclosure_type || 'other']);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'ethics_governance', entityId: getFirstRow(result)?.report_id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.ethics_governance.created' });
  res.status(201).json(getFirstRow(result));
}));

// GET /api/governance/ethics/whistleblower-reports
router.get("/whistleblower-reports", authenticate, requirePermission("policy.document.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
  `SELECT * FROM "${schema}".ethics_reports WHERE report_type = 'whistleblower' AND deleted_at IS NULL ORDER BY created_at DESC`
  ), { tenantId: req.tenantId!, operation: 'query ethics_reports' });
  res.json({ items: result.rows, count: result.rows.length });
}));

// GET /api/governance/ethics/conflict-of-interest
router.get("/conflict-of-interest", authenticate, requirePermission("policy.document.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
  `SELECT * FROM "${schema}".ethics_reports WHERE report_type = 'conflict_of_interest' AND deleted_at IS NULL ORDER BY created_at DESC`
  ), { tenantId: req.tenantId!, operation: 'query ethics_reports' });
  res.json({ items: result.rows, count: result.rows.length });
}));

router.get("/:id", authenticate, requirePermission("policy.document.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(
  `SELECT * FROM "${schema}".ethics_reports WHERE report_id = $1 AND deleted_at IS NULL`,
  [req.params.id]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: "Report not found" }); return; }
  res.json(getFirstRow(result));
}));

router.post("/", authenticate, requirePermission("policy.document.write"), validate({ body: createEthicsReportBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const tenantId = req.tenantId!;
  const { title, description, severity, report_type, category, anonymous } = req.body;
  if (!title) { res.status(400).json({ error: "title required" }); return; }
  const result = await safeQuery(`
  INSERT INTO "${schema}".ethics_reports
  (title, description, severity, report_type, category, reporter_id, anonymous)
  VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
  `, [
  title, description || '', severity || 'medium',
  report_type || 'ethics_violation', category || null,
  anonymous ? null : req.user?.userId,
  anonymous || false,
  ]);
  const report = getFirstRow(result)!;

  if (severity === 'critical' || severity === 'high') {
  try {
  const { escalateEthicsReportToGovernance } = await import('../../services/governance/governance-hooks.service.js');
  await escalateEthicsReportToGovernance(tenantId, report.report_id, severity);
  } catch { }
  }

  setAuditData(res as any, { action: "create", entityType: "ethics_report", entityId: report.report_id, afterState: report });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'ethics_governance', entityId: '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.ethics_governance.created' });
  res.status(201).json(report);
}));

router.put("/:id", authenticate, requirePermission("policy.document.write"), validate({ body: updateEthicsReportBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const { status, assigned_investigator, resolution, severity } = req.body;
  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [req.params.id];
  let idx = 2;
  if (status) { sets.push(`status = $${idx++}`); params.push(status); }
  if (assigned_investigator) { sets.push(`assigned_investigator = $${idx++}`); params.push(assigned_investigator); }
  if (resolution) { sets.push(`resolution = $${idx++}`); params.push(resolution); }
  if (severity) { sets.push(`severity = $${idx++}`); params.push(severity); }
  if (status === 'resolved') { sets.push(`resolution_date = NOW()`); }
  const result = await safeQuery(`
  UPDATE "${schema}".ethics_reports SET ${sets.join(', ')}
  WHERE report_id = $1 AND deleted_at IS NULL RETURNING *
  `, params);
  if (!getFirstRow(result)) { res.status(404).json({ error: "Report not found" }); return; }
  setAuditData(res as any, { action: "update", entityType: "ethics_report", entityId: req.params.id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'ethics_governance', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.ethics_governance.updated' });
  res.json(getFirstRow(result));
}));

router.delete("/:id", authenticate, requirePermission("policy.document.delete"), validate({ body: genericGovernanceSchema }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(
  `UPDATE "${schema}".ethics_reports SET deleted_at = NOW() WHERE report_id = $1 AND deleted_at IS NULL RETURNING report_id`,
  [req.params.id]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: "Report not found" }); return; }
  setAuditData(res as any, { action: "delete", entityType: "ethics_report", entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'deleted', entityType: 'ethics_governance', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.ethics_governance.deleted' });
  res.json({ deleted: true });
}));

router.get("/:id/actions", authenticate, requirePermission("policy.document.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(`
  SELECT * FROM "${schema}".ethics_actions
  WHERE report_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC
  `, [req.params.id]);
  res.json({ actions: result.rows, count: result.rows.length });
}));

router.post("/:id/actions", authenticate, requirePermission("policy.document.write"), validate({ body: createEthicsActionBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const { title, description, action_type, assigned_to, due_date } = req.body;
  if (!title) { res.status(400).json({ error: "title required" }); return; }
  const result = await safeQuery(`
  INSERT INTO "${schema}".ethics_actions
  (report_id, title, description, action_type, assigned_to, due_date)
  VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
  `, [req.params.id, title, description || '', action_type || 'corrective', assigned_to || null, due_date || null]);
  setAuditData(res as any, { action: "create", entityType: "ethics_action", entityId: getFirstRow(result)?.action_id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'ethics_governance', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.ethics_governance.created' });
  res.status(201).json(getFirstRow(result));
}));

router.put("/:reportId/actions/:actionId", authenticate, requirePermission("policy.document.write"), validate({ body: updateEthicsActionBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const { status, outcome } = req.body;
  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [req.params.actionId];
  let idx = 2;
  if (status) { sets.push(`status = $${idx++}`); params.push(status); }
  if (outcome) { sets.push(`outcome = $${idx++}`); params.push(outcome); }
  if (status === 'completed') { sets.push(`completed_at = NOW()`); }
  const result = await safeQuery(`
  UPDATE "${schema}".ethics_actions SET ${sets.join(', ')}
  WHERE action_id = $1 AND deleted_at IS NULL RETURNING *
  `, params);
  if (!getFirstRow(result)) { res.status(404).json({ error: "Action not found" }); return; }
  setAuditData(res as any, { action: "update", entityType: "ethics_action", entityId: req.params.actionId, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'ethics_governance', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.ethics_governance.updated' });
  res.json(getFirstRow(result));
}));

export default router;


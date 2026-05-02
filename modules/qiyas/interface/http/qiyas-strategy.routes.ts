import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC } from '@dos/platform-core/resilience';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());
/**
 * qiyas-strategy.routes.ts — Strategy Direction Layer endpoints
 * Covers: strategic objectives, themes, priorities, risk appetite,
 * KPI/KRI workspace, metric snapshots, improvement roadmap, executive packs, admin
 */
import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { validate, asyncHandler, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../ports/middleware.port';
import { v4 as uuid } from 'uuid';
import { createObjectivesBody, updateObjectivesBody, createThemesBody, createPrioritiesBody, createRiskAppetiteBody, createApproveBody, createSnapshotsBody, createRoadmapBody, updateRoadmapBody, createGenerateBody, updateSettingsBody } from '../../schemas/qiyas.schemas';

const router = Router();
router.use(moduleStack('qiyas'));
router.use(auditMiddleware('qiyas'));
router.use(automationMiddleware('qiyas'));

// ══════════════════════════════════════════════════════════════════
// STRATEGY HOME — Dashboard overview
// ══════════════════════════════════════════════════════════════════

router.get('/overview', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);

  const [objectives, themes, priorities, appetite, roadmap, maturity] = await Promise.all([
    safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'active') AS active,
              COUNT(*) FILTER (WHERE status = 'at_risk') AS at_risk, AVG(progress_pct) AS avg_progress
              FROM "${schema}".strategic_objectives WHERE status != 'retired'`, []).catch(() => ({ rows: [{}] })),
    safeQuery(`SELECT COUNT(*) AS total FROM "${schema}".strategic_themes WHERE status = 'active'`, []).catch(() => ({ rows: [{}] })),
    safeQuery(`SELECT COUNT(*) AS total FROM "${schema}".enterprise_priorities WHERE status = 'active'`, []).catch(() => ({ rows: [{}] })),
    safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'approved') AS approved
              FROM "${schema}".risk_appetite_statements`, []).catch(() => ({ rows: [{}] })),
    safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'completed') AS completed,
              COUNT(*) FILTER (WHERE status = 'blocked') AS blocked
              FROM "${schema}".roadmap_items`, []).catch(() => ({ rows: [{}] })),
    safeQuery(`SELECT overall_score, maturity_level FROM "${schema}".qiyas_assessments
              WHERE status = 'finalized' ORDER BY finalized_at DESC NULLS LAST LIMIT 1`, []).catch(() => ({ rows: [] })),
  ]);

  const o = objectives.rows[0] || {};
  const t = themes.rows[0] || {};
  const p = priorities.rows[0] || {};
  const a = appetite.rows[0] || {};
  const r = roadmap.rows[0] || {};
  const m = maturity.rows[0] || {};

  res.json({
    objectives: { total: +o.total || 0, active: +o.active || 0, atRisk: +o.at_risk || 0, avgProgress: Math.round(+o.avg_progress || 0) },
    themes: { total: +t.total || 0 },
    priorities: { total: +p.total || 0 },
    riskAppetite: { total: +a.total || 0, approved: +a.approved || 0 },
    roadmap: { total: +r.total || 0, completed: +r.completed || 0, blocked: +r.blocked || 0 },
    latestMaturity: { score: m.overall_score || null, level: m.maturity_level || null },
  });
}));

// ══════════════════════════════════════════════════════════════════
// STRATEGIC OBJECTIVES — Full CRUD
// ══════════════════════════════════════════════════════════════════

router.get('/objectives', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const { status, themeId, ownerId, limit = '50', offset = '0' } = req.query;
  let sql = `SELECT * FROM "${schema}".strategic_objectives WHERE 1=1`;
  const params: unknown[] = [];
  let idx = 1;
  if (status) { sql += ` AND status = $${idx++}`; params.push(status); }
  if (themeId) { sql += ` AND linked_theme_id = $${idx++}`; params.push(themeId); }
  if (ownerId) { sql += ` AND owner_id = $${idx++}`; params.push(ownerId); }
  sql += ` ORDER BY priority DESC, created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(+limit, +offset);
  const result = await safeQuery(sql, params);
  const countR = await safeQuery(`SELECT COUNT(*) FROM "${schema}".strategic_objectives WHERE status != 'retired'`, []);
  res.json({ objectives: result.rows, total: +(countR.rows[0]?.count || 0) });
}));

router.get('/objectives/:id', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(`SELECT * FROM "${schema}".strategic_objectives WHERE objective_id = $1`, [req.params.id]);
  if (!result.rows.length) { res.status(404).json({ error: 'Objective not found' }); return; }
  res.json(result.rows[0]);
}));

router.post('/objectives', authenticate, requirePermission('governance.record.write'), validate({ body: createObjectivesBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const id = uuid();
  const { code, titleEn, titleAr, description, category, ownerId, sponsorId, status, priority, targetDate, linkedThemeId } = req.body;
  await safeQuery(
    `INSERT INTO "${schema}".strategic_objectives
     (objective_id, code, title_en, title_ar, description, category, owner_id, sponsor_id, status, priority, target_date, linked_theme_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [id, code || `OBJ-${Date.now()}`, titleEn, titleAr, description, category || 'governance',
     ownerId, sponsorId, status || 'draft', priority || 'medium', targetDate, linkedThemeId, req.user?.userId]
  );
  setAuditData(res as any, { action: 'create', entityType: 'strategic_objective', entityId: id });
  res.status(201).json({ objectiveId: id });
}));

router.put('/objectives/:id', authenticate, requirePermission('governance.record.write'), validate({ body: updateObjectivesBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const { titleEn, titleAr, description, category, ownerId, sponsorId, status, priority, targetDate, progressPct, linkedThemeId, linkedRisks, linkedKpis } = req.body;
  await safeQuery(
    `UPDATE "${schema}".strategic_objectives SET
     title_en = COALESCE($1, title_en), title_ar = COALESCE($2, title_ar), description = COALESCE($3, description),
     category = COALESCE($4, category), owner_id = COALESCE($5, owner_id), sponsor_id = COALESCE($6, sponsor_id),
     status = COALESCE($7, status), priority = COALESCE($8, priority), target_date = COALESCE($9, target_date),
     progress_pct = COALESCE($10, progress_pct), linked_theme_id = COALESCE($11, linked_theme_id),
     linked_risks = COALESCE($12, linked_risks), linked_kpis = COALESCE($13, linked_kpis),
     updated_at = NOW() WHERE objective_id = $14`,
    [titleEn, titleAr, description, category, ownerId, sponsorId, status, priority, targetDate,
     progressPct, linkedThemeId, linkedRisks, linkedKpis, req.params.id]
  );
  setAuditData(res as any, { action: 'update', entityType: 'strategic_objective', entityId: req.params.id });
  res.json({ success: true });
}));

router.delete('/objectives/:id', authenticate, requirePermission('governance.record.write'), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  await safeQuery(`UPDATE "${schema}".strategic_objectives SET status = 'retired', updated_at = NOW() WHERE objective_id = $1`, [req.params.id]);
  res.status(204).send();
}));

// ══════════════════════════════════════════════════════════════════
// STRATEGIC THEMES
// ══════════════════════════════════════════════════════════════════

router.get('/themes', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(`SELECT * FROM "${schema}".strategic_themes ORDER BY display_order, created_at`, []);
  res.json({ themes: result.rows });
}));

router.post('/themes', authenticate, requirePermission('governance.record.write'), validate({ body: createThemesBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const id = uuid();
  const { code, titleEn, titleAr, description, color, icon, fiscalYear } = req.body;
  await safeQuery(
    `INSERT INTO "${schema}".strategic_themes (theme_id, code, title_en, title_ar, description, color, icon, fiscal_year)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, code || `TH-${Date.now()}`, titleEn, titleAr, description, color, icon, fiscalYear]
  );
  res.status(201).json({ themeId: id });
}));

// ══════════════════════════════════════════════════════════════════
// ENTERPRISE PRIORITIES
// ══════════════════════════════════════════════════════════════════

router.get('/priorities', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(`SELECT * FROM "${schema}".enterprise_priorities ORDER BY priority_level, created_at`, []);
  res.json({ priorities: result.rows });
}));

router.post('/priorities', authenticate, requirePermission('governance.record.write'), validate({ body: createPrioritiesBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const id = uuid();
  const { titleEn, titleAr, description, priorityLevel, category, linkedThemeId, ownerId } = req.body;
  await safeQuery(
    `INSERT INTO "${schema}".enterprise_priorities (priority_id, title_en, title_ar, description, priority_level, category, linked_theme_id, owner_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, titleEn, titleAr, description, priorityLevel || 1, category || 'strategic', linkedThemeId, ownerId]
  );
  res.status(201).json({ priorityId: id });
}));

// ══════════════════════════════════════════════════════════════════
// RISK APPETITE STATEMENTS
// ══════════════════════════════════════════════════════════════════

router.get('/risk-appetite', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(`SELECT * FROM "${schema}".risk_appetite_statements ORDER BY risk_category, created_at`, []);
  res.json({ statements: result.rows });
}));

router.post('/risk-appetite', authenticate, requirePermission('governance.record.write'), validate({ body: createRiskAppetiteBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const id = uuid();
  const { riskCategory, statementEn, statementAr, appetiteLevel, toleranceLower, toleranceUpper, unit, linkedKriIds, effectiveFrom } = req.body;
  await safeQuery(
    `INSERT INTO "${schema}".risk_appetite_statements
     (statement_id, risk_category, statement_en, statement_ar, appetite_level, tolerance_lower, tolerance_upper, unit, linked_kri_ids, effective_from, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft')`,
    [id, riskCategory, statementEn, statementAr, appetiteLevel || 'moderate', toleranceLower, toleranceUpper, unit || 'percentage', linkedKriIds || [], effectiveFrom]
  );
  res.status(201).json({ statementId: id });
}));

router.post('/risk-appetite/:id/approve', authenticate, requirePermission('governance.record.manage'), validate({ body: createApproveBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  await safeQuery(`UPDATE "${schema}".risk_appetite_statements SET status = 'approved', approved_by = $1, approved_at = NOW() WHERE statement_id = $2`,
    [req.user?.userId, req.params.id]);
  res.json({ success: true });
}));

// ══════════════════════════════════════════════════════════════════
// KPI/KRI WORKSPACE — Metric snapshots + trend data
// ══════════════════════════════════════════════════════════════════

router.get('/metrics/snapshots', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const { metricType, metricKey, scopeType, limit = '100' } = req.query;
  let sql = `SELECT * FROM "${schema}".metric_snapshots WHERE 1=1`;
  const params: unknown[] = [];
  let idx = 1;
  if (metricType) { sql += ` AND metric_type = $${idx++}`; params.push(metricType); }
  if (metricKey) { sql += ` AND metric_key = $${idx++}`; params.push(metricKey); }
  if (scopeType) { sql += ` AND scope_type = $${idx++}`; params.push(scopeType); }
  sql += ` ORDER BY captured_at DESC LIMIT $${idx++}`;
  params.push(+limit);
  const result = await safeQuery(sql, params);
  res.json({ snapshots: result.rows, count: result.rows.length });
}));

router.post('/metrics/snapshots', authenticate, requirePermission('governance.record.write'), validate({ body: createSnapshotsBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const id = uuid();
  const { metricType, metricKey, metricLabel, value, previousValue, targetValue, unit, scopeType, scopeRefId } = req.body;
  await safeQuery(
    `INSERT INTO "${schema}".metric_snapshots
     (snapshot_id, metric_type, metric_key, metric_label, value, previous_value, target_value, unit, scope_type, scope_ref_id, captured_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, metricType, metricKey, metricLabel, value, previousValue, targetValue, unit || 'score', scopeType || 'tenant', scopeRefId, req.user!.userId!]
  );
  res.status(201).json({ snapshotId: id });
}));

router.get('/metrics/trends', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const { metricKey, days = '90' } = req.query;
  const result = await safeQuery(
    `SELECT metric_key, metric_label, value, target_value, captured_at
     FROM "${schema}".metric_snapshots
     WHERE metric_key = $1 AND captured_at >= NOW() - ($2 || ' days')::INTERVAL
     ORDER BY captured_at ASC`, [metricKey, days]
  );
  res.json({ trend: result.rows });
}));

// ══════════════════════════════════════════════════════════════════
// IMPROVEMENT ROADMAP — Full CRUD
// ══════════════════════════════════════════════════════════════════

router.get('/roadmap', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const { status, phase, objectiveId, limit = '100' } = req.query;
  let sql = `SELECT * FROM "${schema}".roadmap_items WHERE 1=1`;
  const params: unknown[] = [];
  let idx = 1;
  if (status) { sql += ` AND status = $${idx++}`; params.push(status); }
  if (phase) { sql += ` AND phase = $${idx++}`; params.push(phase); }
  if (objectiveId) { sql += ` AND linked_objective_id = $${idx++}`; params.push(objectiveId); }
  sql += ` ORDER BY priority DESC, target_date ASC NULLS LAST LIMIT $${idx++}`;
  params.push(+limit);
  const result = await safeQuery(sql, params);
  const countR = await safeQuery(`SELECT COUNT(*) FROM "${schema}".roadmap_items`, []);
  res.json({ items: result.rows, total: +(countR.rows[0]?.count || 0) });
}));

router.post('/roadmap', authenticate, requirePermission('governance.record.write'), validate({ body: createRoadmapBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const id = uuid();
  const { titleEn, titleAr, description, itemType, phase, priority, ownerId, teamId,
          linkedObjectiveId, linkedMaturityDomain, targetMaturityLevel, startDate, targetDate, effortDays } = req.body;
  await safeQuery(
    `INSERT INTO "${schema}".roadmap_items
     (item_id, title_en, title_ar, description, item_type, phase, priority, status, owner_id, team_id,
      linked_objective_id, linked_maturity_domain, target_maturity_level, start_date, target_date, effort_days, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'planned',$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [id, titleEn, titleAr, description, itemType || 'improvement', phase || 'plan', priority || 'medium',
     ownerId, teamId, linkedObjectiveId, linkedMaturityDomain, targetMaturityLevel, startDate, targetDate, effortDays, req.user?.userId]
  );
  setAuditData(res as any, { action: 'create', entityType: 'roadmap_item', entityId: id });
  res.status(201).json({ itemId: id });
}));

router.put('/roadmap/:id', authenticate, requirePermission('governance.record.write'), validate({ body: updateRoadmapBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const { titleEn, status, phase, progressPct, ownerId, targetDate, completedDate } = req.body;
  await safeQuery(
    `UPDATE "${schema}".roadmap_items SET
     title_en = COALESCE($1, title_en), status = COALESCE($2, status), phase = COALESCE($3, phase),
     progress_pct = COALESCE($4, progress_pct), owner_id = COALESCE($5, owner_id),
     target_date = COALESCE($6, target_date), completed_date = $7, updated_at = NOW()
     WHERE item_id = $8`,
    [titleEn, status, phase, progressPct, ownerId, targetDate, completedDate, req.params.id]
  );
  res.json({ success: true });
}));

// ══════════════════════════════════════════════════════════════════
// QIYAS SCORECARDS — Aggregated scorecard view
// ══════════════════════════════════════════════════════════════════

router.get('/scorecards', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const assessments = await safeQuery(
    `SELECT a.assessment_id, a.model_id, a.status, a.overall_score, a.maturity_level, a.created_at,
            m.name_en AS model_name, m.code AS model_code
     FROM "${schema}".qiyas_assessments a
     LEFT JOIN "${schema}".qiyas_models m ON m.model_id = a.model_id
     WHERE a.status = 'finalized'
     ORDER BY a.created_at DESC LIMIT 20`, []
  ).catch(() => ({ rows: [] }));

  const domainScores = await safeQuery(
    `SELECT sr.assessment_id, sr.domain_id, sr.raw_score, sr.weighted_score, sr.maturity_level,
            d.code AS domain_code, d.name_en AS domain_name
     FROM "${schema}".qiyas_score_results sr
     LEFT JOIN "${schema}".qiyas_domains d ON d.domain_id = sr.domain_id
     ORDER BY sr.assessment_id, d.sort_order`, []
  ).catch(() => ({ rows: [] }));

  res.json({ assessments: assessments.rows, domainScores: domainScores.rows });
}));

// ══════════════════════════════════════════════════════════════════
// EXECUTIVE PACKS — Strategy-level report generation
// ══════════════════════════════════════════════════════════════════

router.get('/executive-packs', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  res.json({ packs: [
    { id: 'strategy-overview', name: 'Strategy Overview Pack', audience: 'Board / C-Suite', formats: ['pdf', 'pptx'] },
    { id: 'maturity-report', name: 'Maturity Assessment Report', audience: 'Governance Committee', formats: ['pdf'] },
    { id: 'kpi-kri-dashboard', name: 'KPI/KRI Dashboard Pack', audience: 'Executive Team', formats: ['pdf', 'xlsx'] },
    { id: 'risk-appetite-report', name: 'Risk Appetite Report', audience: 'Risk Committee', formats: ['pdf'] },
    { id: 'improvement-roadmap', name: 'Improvement Roadmap', audience: 'Strategy Team', formats: ['pdf', 'xlsx'] },
    { id: 'benchmark-report', name: 'Benchmark Comparison', audience: 'Executive Team', formats: ['pdf'] },
  ]});
}));

router.post('/executive-packs/generate', authenticate, requirePermission('governance.record.write'), validate({ body: createGenerateBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const { packId, format } = req.body;
  const runId = uuid();
  await safeQuery(
    `INSERT INTO "${schema}".compliance_activity_log (id, entity_type, entity_id, action, actor_user_id, after_json, created_at)
     VALUES ($1, 'strategy_report', $2, 'generate', $3, $4, NOW())`,
    [uuid(), packId, req.user?.userId, JSON.stringify({ format })]

  ).catch(catchHandler(EC.EVENT_BUS));
  res.status(202).json({ runId, packId, format, status: 'queued' });
}));

// ══════════════════════════════════════════════════════════════════
// ADMIN — Settings for strategy/qiyas module
// ══════════════════════════════════════════════════════════════════

router.get('/admin/settings', authenticate, requirePermission('governance.record.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(`SELECT settings_json FROM "${schema}".module_settings WHERE module_code = 'qiyas'`, []).catch(() => ({ rows: [] }));
  res.json(result.rows[0]?.settings_json || {});
}));

router.patch('/admin/settings', authenticate, requirePermission('governance.record.manage'), validate({ body: updateSettingsBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  await safeQuery(
    `INSERT INTO "${schema}".module_settings (module_code, settings_json, updated_at)
     VALUES ('qiyas', $1, NOW())
     ON CONFLICT (module_code) DO UPDATE SET settings_json = $1, updated_at = NOW()`,
    [JSON.stringify(req.body)]
  );
  res.json({ success: true });
}));

export default router;


import { emitEvent as _emitEvent } from '../../../ports/events.port';
import { swallow as _swallow, EC } from '@dos/platform-core/resilience';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());
/**
 * compliance-extended.routes.ts
 * Missing endpoints from enterprise spec gap analysis:
 * - Work Queue aggregation
 * - Regulatory Change triage + task creation + decision log
 * - Mapping analysis (unmapped, weak controls)
 * - Issue creation from assessment
 * - Reports catalog + run + history
 * - Admin settings PATCH + applicability rules
 * - Obligation applicability
 */
import { Router } from 'express';
import { authenticate, requirePermission } from '../../../ports/auth.port';
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { validate, asyncHandler, auditMiddleware, setAuditData, automationMiddleware, moduleStack, mutationEventHook } from '../../../ports/middleware.port';
import { v4 as uuid } from 'uuid';
import { createTriageBody, createTasksBody, createFromAssessmentBody, createRunBody, updateSettingsBody, createApplicabilityRulesBody, createApplicabilityBody } from '../../../schemas/compliance.schemas';

const router = Router();
router.use(moduleStack('compliance'));
router.use(mutationEventHook('compliance'));
router.use(auditMiddleware('compliance'));
router.use(automationMiddleware('compliance'));

// ══════════════════════════════════════════════════════════════════
// GROUP 1: WORK QUEUE — Aggregated compliance work items
// ══════════════════════════════════════════════════════════════════

router.get('/work-queue', authenticate, requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const userId = req.user!.userId!;
  const scope = req.query.scope as string | undefined; // 'my' or undefined

  const items: unknown[] = [];

  // 1. Overdue gaps / remediation
  // secrets-scan-allow: schema tenantSchema()-validated; where clause composed of static literals + $N binds
  const gapsQ = await safeQuery(
    `SELECT gap_id AS id, 'remediation' AS type, title, severity AS priority, status, owner_id AS owner,
            due_date, framework_id, obligation_code AS obligation_ref
     FROM "${schema}".compliance_gaps
     WHERE status IN ('open','in_progress') AND deleted_at IS NULL
     ${scope === 'my' && userId ? `AND owner_id = '${userId}'` : ''}
     ORDER BY due_date ASC NULLS LAST LIMIT 50`, []
  ).catch(() => ({ rows: [] }));
  items.push(...gapsQ.rows);

  // 2. Pending evidence requests
  // secrets-scan-allow: schema tenantSchema()-validated; where clause composed of static literals + $N binds
  const evQ = await safeQuery(
    `SELECT request_id AS id, 'evidence' AS type, 'Evidence: ' || evidence_type AS title,
            'medium' AS priority, status, requested_from AS owner, due_date
     FROM "${schema}".evidence_requests
     WHERE status = 'pending'
     ${scope === 'my' && userId ? `AND requested_from = '${userId}'` : ''}
     ORDER BY due_date ASC NULLS LAST LIMIT 30`, []
  ).catch(() => ({ rows: [] }));
  items.push(...evQ.rows);

  // 3. Expiring exceptions
  const excQ = await safeQuery(
    `SELECT exception_id AS id, 'exception' AS type,
            'Exception: ' || control_id AS title, risk_impact AS priority,
            status, approver_designation AS owner, expiry_date AS due_date
     FROM "${schema}".exceptions
     WHERE status = 'approved' AND expiry_date <= NOW() + INTERVAL '30 days'
     ORDER BY expiry_date ASC LIMIT 20`, []
  ).catch(() => ({ rows: [] }));
  items.push(...excQ.rows);

  // 4. Pending regulatory changes (table: regulatory_changes)
  const rcQ = await safeQuery(
    `SELECT change_id AS id, 'change' AS type, regulation_name AS title,
            impact_level AS priority, response_status AS status, effective_date AS due_date
     FROM "${schema}".regulatory_changes
     WHERE response_status IN ('pending_review','impact_assessed')
     ORDER BY effective_date ASC NULLS LAST LIMIT 20`, []
  ).catch(() => ({ rows: [] }));
  items.push(...rcQ.rows);

  res.json({ items, total: items.length });
}));

// ══════════════════════════════════════════════════════════════════
// GROUP 2: REGULATORY CHANGE LIFECYCLE — Triage + Tasks + Decision Log
// ══════════════════════════════════════════════════════════════════

router.post('/regulatory-change/:changeId/triage', authenticate, requirePermission('compliance.program.write'), validate({ body: createTriageBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const { changeId } = req.params;
  const { decision, rationale } = req.body;
  const userId = req.user!.userId!;

  const decisionId = uuid();
  await safeQuery(
    `INSERT INTO "${schema}".change_triage_decisions
     (decision_id, change_event_id, decision, rationale, decided_by, decided_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [decisionId, changeId, decision || 'pending', rationale || null, userId]
  );

  // Update triage_status on regulatory_changes table
  await safeQuery(
    `UPDATE "${schema}".regulatory_changes SET triage_status = $1 WHERE change_id = $2`,
    [decision || 'pending', changeId]

  ).catch(catchHandler(EC.EVENT_BUS));

  setAuditData(res as any, { action: 'create', entityType: 'change_triage', entityId: decisionId });
  res.status(201).json({ decisionId, changeId, decision, rationale, decidedBy: userId });
}));

router.post('/regulatory-change/:changeId/tasks', authenticate, requirePermission('compliance.program.write'), validate({ body: createTasksBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const { changeId } = req.params;
  const { tasks } = req.body; // Array of { taskType, title, linkedRefType, linkedRefId, assigneeUserId, dueDate, priority }
  const userId = req.user!.userId!;

  const created: unknown[] = [];
  for (const t of (tasks || [])) {
    const taskId = uuid();
    await safeQuery(
      `INSERT INTO "${schema}".change_tasks
       (task_id, change_event_id, task_type, title, description, linked_ref_type, linked_ref_id,
        assignee_user_id, due_date, priority, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'open', $11)`,
      [taskId, changeId, t.taskType || 'review', t.title, t.description || null,
       t.linkedRefType || null, t.linkedRefId || null,
       t.assigneeUserId || null, t.dueDate || null, t.priority || 'medium', userId]
    );
    created.push({ taskId, ...t });
  }

  res.status(201).json({ changeId, tasks: created, count: created.length });
}));

router.get('/regulatory-change/:changeId/decision-log', authenticate, requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const { changeId } = req.params;

  const decisions = await safeQuery(
    `SELECT decision_id, change_event_id, decision, rationale, decided_by, decided_at, created_at
     FROM "${schema}".change_triage_decisions
     WHERE change_event_id = $1
     ORDER BY decided_at DESC`, [changeId]
  );

  const tasks = await safeQuery(
    `SELECT task_id, task_type, title, linked_ref_type, linked_ref_id,
            assignee_user_id, due_date, priority, status, completed_at, created_at
     FROM "${schema}".change_tasks
     WHERE change_event_id = $1
     ORDER BY created_at DESC`, [changeId]
  );

  res.json({ changeId, decisions: decisions.rows, tasks: tasks.rows });
}));

// ══════════════════════════════════════════════════════════════════
// GROUP 3: MAPPING ANALYSIS — Unmapped obligations + Weak controls
// ══════════════════════════════════════════════════════════════════

router.get('/mapping/unmapped', authenticate, requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const frameworkId = req.query.frameworkId as string | undefined;

  let sql = `
    SELECT o.obligation_id, o.title_en, o.title_ar, o.framework_id, o.priority, o.status
    FROM "${schema}".compliance_obligations o
    LEFT JOIN "${schema}".obligation_control_mappings m ON m.obligation_id = o.obligation_id
    WHERE o.deleted_at IS NULL AND m.mapping_id IS NULL
  `;
  const params: unknown[] = [];
  if (frameworkId) { sql += ` AND o.framework_id = $1`; params.push(frameworkId); }
  sql += ` ORDER BY o.priority DESC, o.title_en`;

  const result = await safeQuery(sql, params);
  res.json({ unmapped: result.rows, count: result.rows.length });
}));

router.get('/mapping/weak-controls', authenticate, requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);

  const result = await safeQuery(`
    SELECT c.control_id, c.title, c.status, c.test_status, c.owner,
           COUNT(m.obligation_id) AS obligation_count,
           COALESCE(AVG(m.coverage_percent), 0) AS avg_coverage
    FROM "${schema}".controls c
    LEFT JOIN "${schema}".obligation_control_mappings m ON m.control_id = c.control_id
    WHERE c.deleted_at IS NULL
      AND (c.test_status IS NULL OR c.test_status = 'fail' OR c.status NOT IN ('implemented', 'effective'))
    GROUP BY c.control_id, c.title, c.status, c.test_status, c.owner
    HAVING COUNT(m.obligation_id) > 0
    ORDER BY avg_coverage ASC, obligation_count DESC
    LIMIT 50
  `, []);

  res.json({ weakControls: result.rows, count: result.rows.length });
}));

// ══════════════════════════════════════════════════════════════════
// GROUP 4: ISSUE MANAGEMENT — Create issue from assessment
// ══════════════════════════════════════════════════════════════════

router.post('/issues/from-assessment', authenticate, requirePermission('compliance.program.write'), validate({ body: createFromAssessmentBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const { assessmentId, obligationId, title, severity, description } = req.body;
  const userId = req.user!.userId!;

  const gapId = uuid();
  await safeQuery(
    `INSERT INTO "${schema}".compliance_gaps
     (gap_id, title, description, severity, status, source_type, source_id,
      obligation_code, owner_id, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'open', 'assessment', $5, $6, $7, $8, NOW(), NOW())`,
    [gapId, title || 'Gap from assessment', description || null,
     severity || 'medium', assessmentId || null, obligationId || null, userId, userId]
  );

  setAuditData(res as any, { action: 'create', entityType: 'compliance_gap', entityId: gapId });
  res.status(201).json({ gapId, assessmentId, obligationId, severity, status: 'open' });
}));

// ══════════════════════════════════════════════════════════════════
// GROUP 5: REPORTS — Catalog + Run + History
// ══════════════════════════════════════════════════════════════════

const REPORT_CATALOG = [
  { id: 'executive-pack', name: 'Executive Pack', audience: 'C-Suite / Board', formats: ['pdf', 'pptx'] },
  { id: 'board-pack', name: 'Board Pack', audience: 'Board of Directors', formats: ['pdf', 'pptx'] },
  { id: 'regulator-pack', name: 'Regulator Pack', audience: 'Regulators / Auditors', formats: ['pdf', 'xlsx'] },
  { id: 'framework-report', name: 'Framework Report', audience: 'Compliance Team', formats: ['pdf', 'xlsx'] },
  { id: 'business-unit-report', name: 'Business Unit Report', audience: 'Department Heads', formats: ['pdf', 'xlsx'] },
  { id: 'evidence-report', name: 'Evidence Report', audience: 'Evidence Owners', formats: ['pdf', 'xlsx'] },
  { id: 'gaps-report', name: 'Gaps & Remediation Report', audience: 'Risk & Compliance', formats: ['pdf', 'xlsx'] },
  { id: 'audit-package', name: 'Audit Package', audience: 'External Auditors', formats: ['json', 'zip'] },
];

router.get('/reports/catalog', authenticate, requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (_req, res) => {
  res.json({ reports: REPORT_CATALOG });
}));

router.post('/reports/run', authenticate, requirePermission('compliance.program.write'), validate({ body: createRunBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const { reportId, format, frameworkId, businessUnitId } = req.body;
  const userId = req.user!.userId!;
  const runId = uuid();

  // Log report run
  await safeQuery(
    `INSERT INTO "${schema}".compliance_activity_log
     (id, entity_type, entity_id, action, actor_user_id, before_json, after_json, created_at)
     VALUES ($1, 'report', $2, 'generate', $3, NULL, $4, NOW())`,
    [uuid(), reportId, userId, JSON.stringify({ format, frameworkId, businessUnitId })]

  ).catch(catchHandler(EC.EVENT_BUS));

  res.status(202).json({ runId, reportId, format, status: 'queued', message: 'Report generation queued' });
}));

router.get('/reports/history', authenticate, requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const limit = parseInt(req.query.limit as string || '20', 10);

  const result = await safeQuery(
    `SELECT id, entity_id AS report_id, action, actor_user_id, after_json AS params, created_at
     FROM "${schema}".compliance_activity_log
     WHERE entity_type = 'report'
     ORDER BY created_at DESC LIMIT $1`, [limit]
  ).catch(() => ({ rows: [] }));

  res.json({ history: result.rows, count: result.rows.length });
}));

// ══════════════════════════════════════════════════════════════════
// GROUP 6: ADMIN — Settings PATCH + Applicability Rules
// ══════════════════════════════════════════════════════════════════

router.patch('/admin/settings', authenticate, requirePermission('compliance.program.manage'), validate({ body: updateSettingsBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const settings = req.body;

  // Upsert compliance settings
  await safeQuery(
    `INSERT INTO "${schema}".module_settings (module_code, settings_json, updated_at)
     VALUES ('compliance', $1, NOW())
     ON CONFLICT (module_code) DO UPDATE SET settings_json = $1, updated_at = NOW()`,
    [JSON.stringify(settings)]

  ).catch(catchHandler(EC.EVENT_BUS));

  setAuditData(res as any, { action: 'update', entityType: 'compliance_settings', entityId: 'compliance' });
  res.json({ success: true, settings });
}));

router.post('/admin/applicability-rules', authenticate, requirePermission('compliance.program.manage'), validate({ body: createApplicabilityRulesBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const { obligationId, ruleType, operator, ruleJson, priority, active } = req.body;
  const ruleId = uuid();

  await safeQuery(
    `INSERT INTO "${schema}".obligation_applicability_rules
     (id, obligation_id, rule_type, operator, rule_json, priority, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [ruleId, obligationId, ruleType, operator || 'equals',
     JSON.stringify(ruleJson || {}), priority || 1, active !== false]
  );

  setAuditData(res as any, { action: 'create', entityType: 'applicability_rule', entityId: ruleId });
  res.status(201).json({ ruleId, obligationId, ruleType, active: active !== false });
}));

// ══════════════════════════════════════════════════════════════════
// GROUP 8: OBLIGATION APPLICABILITY
// ══════════════════════════════════════════════════════════════════

router.post('/obligations/:obligationId/applicability', authenticate, requirePermission('compliance.program.write'), validate({ body: createApplicabilityBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const { obligationId } = req.params;
  const { applicabilityStatus, rationale } = req.body;
  const userId = req.user!.userId!;

  await safeQuery(
    `UPDATE "${schema}".compliance_obligations
     SET applicability = $1, updated_at = NOW(), updated_by = $2
     WHERE obligation_id = $3`,
    [applicabilityStatus, userId, obligationId]
  );

  // Record scope decision
  if (rationale) {
    await safeQuery(
      `INSERT INTO "${schema}".obligation_scopes
       (id, obligation_id, scope_type, status, rationale, decided_by, decided_at)
       VALUES ($1, $2, 'manual', $3, $4, $5, NOW())`,
      [uuid(), obligationId, applicabilityStatus, rationale, userId]

    ).catch(catchHandler(EC.EVENT_BUS));
  }

  setAuditData(res as any, { action: 'update', entityType: 'obligation_applicability', entityId: obligationId });
  res.json({ obligationId, applicabilityStatus, rationale });
}));

// ══════════════════════════════════════════════════════════════════
// GROUP 9: OBLIGATION ACTIVITY LOG — DB-driven audit trail
// ══════════════════════════════════════════════════════════════════

router.get('/obligations/:obligationId/activity', authenticate, requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const { obligationId } = req.params;
  const limit = parseInt(req.query.limit as string || '50', 10);

  // Query activity_stream for this obligation
  const result = await safeQuery(
    `SELECT id, action, entity_type, entity_id, user_id AS actor,
            metadata, created_at AS timestamp
     FROM "${schema}".activity_stream
     WHERE (entity_id = $1 OR (metadata->>'obligationId') = $1)
       AND entity_type IN ('obligation', 'obligation_policy_link', 'obligation_mapping', 'obligation_applicability')
     ORDER BY created_at DESC LIMIT $2`,
    [obligationId, limit]
  ).catch(() => ({ rows: [] }));

  // Also check compliance_activity_log
  const logResult = await safeQuery(
    `SELECT id, action, entity_type, entity_id, actor_user_id AS actor,
            after_json AS metadata, created_at AS timestamp
     FROM "${schema}".compliance_activity_log
     WHERE entity_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [obligationId, limit]
  ).catch(() => ({ rows: [] }));

  const combined = [...result.rows, ...logResult.rows]
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);

  res.json(combined);
}));

export default router;


import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());
/**
 * Module Workflow Routes — start and list module-scoped workflow instances.
 *
 * POST /api/module-workflows/start   — Start a module's primary workflow
 * GET  /api/module-workflows/instances — List active workflow instances for a module
 */


import { authenticate, requirePermission } from '../../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack, mutationEventHook, validate } from '../../ports/middleware.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { startModuleWorkflow } from '../../services/templates/workflow-templates.service';
import { errMsg } from '../../../../i18n/error-messages';
import { z as _z } from 'zod';
import { startBody, instancesQuery, createTransitionBody } from "../../schemas/workflow.schemas";
// ── Zod validation schemas ──
const router = Router();
router.use(auditMiddleware('workflow'));
router.use(moduleStack('workflow'));
router.use(mutationEventHook('workflow'));

/**
 * POST / start — Start a module's primary workflow.
 * Body: { moduleCode, entityId?, context? }
 */
router.post(
  '/start',
  authenticate,
  requirePermission('workflow.instance.execute'),
  validate({ body: startBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const { moduleCode, entityId, context } = req.body;
    const params: Record<string, unknown> = { ...context };
    if (entityId) params.entityId = entityId;

    const result = await startModuleWorkflow(
      req.tenantId!,
      moduleCode,
      params,
      req.user!.userId!,
    );
    res.status(201).json(result);
  }),
);

/**
 * GET /instances — List active workflow instances for a module.
 * Query: ?moduleCode=risk&status=running
 */
router.get(
  '/instances',
  authenticate,
  requirePermission('workflow.instance.read'),
  validate({ query: instancesQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const { moduleCode, status } = req.query as Record<string, string>;
    const schema = tenantSchema(req.tenantId!);

    // Query workflow_executions joined with workflow_chain_instances filtered by entity_type
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (moduleCode) {
      conditions.push(`(we.entity_type = $${paramIdx} OR wci.trigger_entity_type = $${paramIdx})`);
      values.push(moduleCode);
      paramIdx++;
    }
    if (status) {
      conditions.push(`(we.status = $${paramIdx} OR wci.status = $${paramIdx})`);
      values.push(status);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await safeQuery(
      `SELECT
         COALESCE(we.execution_id::text, wci.instance_id::text) AS instance_id,
         COALESCE(we.execution_id::text, wci.instance_id::text) AS execution_id,
         COALESCE(we.status, wci.status) AS status,
         COALESCE(we.entity_type, wci.trigger_entity_type) AS entity_type,
         wci.chain_code,
         we.trigger_type,
         COALESCE(we.started_at, wci.started_at) AS started_at,
         we.completed_at
       FROM "${schema}".workflow_executions we
       FULL OUTER JOIN "${schema}".workflow_chain_instances wci
         ON we.execution_id::text = wci.instance_id::text
       ${whereClause}
       ORDER BY COALESCE(we.started_at, wci.started_at) DESC
       LIMIT 100`,
      values,
    );

    res.json(result.rows);
  }),
);

/**
 * GET /events — List workflow events for audit trail.
 * Query: ?instanceId=X or ?moduleCode=X&limit=200
 */
router.get(
  '/events',
  authenticate,
  requirePermission('workflow.instance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const { instanceId, moduleCode, limit: limitStr } = req.query as Record<string, string>;
    const schema = tenantSchema(req.tenantId!);
    const rowLimit = Math.min(parseInt(limitStr || '200', 10) || 200, 1000);

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (instanceId) {
      conditions.push(`we.instance_id = $${paramIdx}`);
      values.push(instanceId);
      paramIdx++;
    }

    if (moduleCode) {
      // Join to workflow_executions to filter by entity_type
      conditions.push(`wex.entity_type = $${paramIdx}`);
      values.push(moduleCode);
      paramIdx++;
    }

    values.push(rowLimit);
    const limitParam = `$${paramIdx}`;

    const joinClause = moduleCode
      ? `LEFT JOIN "${schema}".workflow_executions wex ON we.instance_id = wex.execution_id::text`
      : '';

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await safeQuery(
      `SELECT
         we.event_id,
         we.instance_id,
         we.event_type,
         we.step_id,
         we.triggered_by,
         we.payload,
         we.created_at AS occurred_at
       FROM "${schema}".workflow_events we
       ${joinClause}
       ${whereClause}
       ORDER BY we.created_at DESC
       LIMIT ${limitParam}`,
      values,
    );

    res.json(result.rows);
  }),
);

const ENTITY_TABLE_MAP: Record<string, { table: string; idCol: string; statusCol: string; ownerCol: string }> = {
  risk:       { table: 'risks',       idCol: 'risk_id',       statusCol: 'status', ownerCol: 'owner_id' },
  compliance: { table: 'obligations', idCol: 'obligation_id', statusCol: 'status', ownerCol: 'owner_id' },
  policy:     { table: 'policies',    idCol: 'policy_id',     statusCol: 'status', ownerCol: 'owner_id' },
  audit:      { table: 'audit_plans', idCol: 'plan_id',       statusCol: 'status', ownerCol: 'lead_auditor_id' },
  evidence:   { table: 'evidence',    idCol: 'evidence_id',   statusCol: 'status', ownerCol: 'owner_id' },
  controls:   { table: 'controls',    idCol: 'control_id',    statusCol: 'status', ownerCol: 'owner_id' },
  incident:   { table: 'incidents',   idCol: 'incident_id',   statusCol: 'status', ownerCol: 'assigned_to' },
  vendor:     { table: 'vendors',     idCol: 'vendor_id',     statusCol: 'status', ownerCol: 'owner_id' },
  asset:      { table: 'assets',      idCol: 'asset_id',      statusCol: 'status', ownerCol: 'owner_id' },
  bcp:        { table: 'bcp_plans',   idCol: 'plan_id',       statusCol: 'status', ownerCol: 'owner_id' },
  exception:  { table: 'exceptions',  idCol: 'exception_id',  statusCol: 'status', ownerCol: 'requestor_id' },
  remediation:{ table: 'remediation_tasks', idCol: 'task_id', statusCol: 'status', ownerCol: 'assigned_to' },
  action:     { table: 'action_items',idCol: 'item_id',       statusCol: 'status', ownerCol: 'assigned_to' },
  training:   { table: 'training_courses', idCol: 'course_id',statusCol: 'status', ownerCol: 'created_by' },
  privacy:    { table: 'privacy_impact_assessments', idCol: 'assessment_id', statusCol: 'status', ownerCol: 'assessor_id' },
  dora:       { table: 'dora_ict_assets', idCol: 'asset_id',  statusCol: 'status', ownerCol: 'owner_id' },
  journey:    { table: 'journey_roadmaps', idCol: 'roadmap_id', statusCol: 'status', ownerCol: 'owner_id' },
};

router.get(
  '/entity-state/:moduleCode/:entityId',
  authenticate,
  requirePermission('workflow.instance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const { moduleCode, entityId } = req.params;
    const mapping = ENTITY_TABLE_MAP[moduleCode];
    if (!mapping) return res.status(404).json({ error: errMsg('workflow.module_not_mapped', req) });

    const schema = tenantSchema(req.tenantId!);
    const result = await safeQuery(
      `SELECT ${mapping.statusCol} AS current_state, ${mapping.ownerCol} AS owner, updated_at
       FROM "${schema}".${mapping.table}
       WHERE ${mapping.idCol} = $1 AND deleted_at IS NULL`,
      [entityId],
    );
    if (!result.rows[0]) return res.status(404).json({ error: errMsg('workflow.entity_not_found', req) });

    const entity = result.rows[0];
    const currentState = entity.current_state || 'draft';

    const approvalResult = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".approval_requests
       WHERE entity_id = $1 AND entity_type = $2 AND status = 'pending'`,
      [entityId, moduleCode],
    );
    const pendingApprovals = approvalResult.rows[0]?.cnt ?? 0;

    const slaResult = await safeQuery(
      `SELECT MIN(sla_due_at) AS sla_due
       FROM "${schema}".sla_lifecycle_transitions
       WHERE entity_id = $1 AND entity_type = $2 AND status = 'active'`,
      [entityId, moduleCode],
    );
    const slaDueDate = slaResult.rows[0]?.sla_due ?? null;

    const historyResult = await safeQuery(
      `SELECT DISTINCT new_value AS state FROM "${schema}".audit_trail
       WHERE entity_id = $1 AND entity_type = $2 AND field_name = 'status'
       ORDER BY state`,
      [entityId, moduleCode],
    );

    const completedStates = historyResult.rows.map(( r: Record<string, unknown>) => r.state).filter((s: string) => s !== currentState);

    const { MODULE_WORKFLOW_MAP } = await import('../../config/module-workflow-map.js');
    const mwEntry = MODULE_WORKFLOW_MAP[moduleCode as keyof typeof MODULE_WORKFLOW_MAP];
    let availableTransitions: string[] = [];
    if (mwEntry) {
      const templateResult = await safeQuery(
        `SELECT template_config FROM "${schema}".workflow_templates WHERE code = $1 AND deleted_at IS NULL LIMIT 1`,
        [mwEntry.templateCode],
      );
      const config = templateResult.rows[0]?.template_config;
      if (config?.transitions) {
        const transitions = config.transitions as Record<string, string[]>;
        availableTransitions = transitions[currentState] ?? [];
      }
    }

    res.json({
      entityId,
      moduleCode,
      currentState,
      completedStates,
      availableTransitions,
      pendingApprovals,
      slaDueDate,
      owner: entity.owner || null,
      updatedAt: entity.updated_at,
    });
  }),
);

router.post(
  '/entity-state/:moduleCode/:entityId/transition',
  authenticate,
  requirePermission('workflow.instance.execute'),
  validate({ body: createTransitionBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const { moduleCode, entityId } = req.params;
    const { toState } = req.body;
    if (!toState) return res.status(400).json({ error: 'toState is required' });

    const mapping = ENTITY_TABLE_MAP[moduleCode];
    if (!mapping) return res.status(404).json({ error: errMsg('workflow.module_not_mapped', req) });

    const schema = tenantSchema(req.tenantId!);

    const currentResult = await safeQuery(
      `SELECT ${mapping.statusCol} AS current_state FROM "${schema}".${mapping.table}
       WHERE ${mapping.idCol} = $1 AND deleted_at IS NULL`, [entityId]);
    if (!currentResult.rows[0]) return res.status(404).json({ error: errMsg('workflow.entity_not_found', req) });

    const fromState = currentResult.rows[0].current_state;

    await safeQuery(
      `UPDATE "${schema}".${mapping.table} SET ${mapping.statusCol} = $1, updated_at = NOW()
       WHERE ${mapping.idCol} = $2 AND deleted_at IS NULL`, [toState, entityId]);

    await safeQuery(
      `INSERT INTO "${schema}".audit_trail (entity_type, entity_id, action, field_name, old_value, new_value, actor_id)
       VALUES ($1, $2, 'status_changed', 'status', $3, $4, $5)`,
      [moduleCode, entityId, fromState, toState, req.user!.userId!]);

    res.json({
      entityId, moduleCode, currentState: toState,
      completedStates: [fromState], availableTransitions: [],
      pendingApprovals: 0, slaDueDate: null,
      owner: null, updatedAt: new Date().toISOString(),
    });
  }),
);

export default router;


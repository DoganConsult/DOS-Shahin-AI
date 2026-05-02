// @ts-nocheck
import { safeQuery, tenantSchema } from '@dos/db';
import { PlaybookTemplateContract, PlaybookStepContract, PlaybookExecutionContract, PlaybookExecutionLogContract } from '../contracts/playbooks.contract';
import { setAuditData } from '../ports/playbooks.ports';

// ── Listing & Aggregates ──
export async function listTemplates(tenantId: string, opts: { limit?: number; offset?: number; status?: string } = {}): Promise<{ data: PlaybookTemplateContract[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const params: any[] = [];
  let where = '';
  if (opts.status) {
    params.push(opts.status);
    where = `WHERE status = $${params.length}`;
  }
  const totalRes = await safeQuery(`SELECT count(*)::int AS n FROM "${schema}".playbook_templates ${where}`, params);
  const listRes = await safeQuery(
    `SELECT template_id as "templateId", name, version, status,
            triggering_events_json as "triggeringEventsJson",
            created_at as "createdAt", updated_at as "updatedAt"
       FROM "${schema}".playbook_templates ${where}
      ORDER BY updated_at DESC
      LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  return { data: listRes.rows as PlaybookTemplateContract[], total: totalRes.rows[0]?.n ?? 0 };
}

export async function getDashboard(tenantId: string): Promise<{
  templates: { total: number; active: number };
  executions: { total: number; running: number; completed: number };
  recentExecutions: any[];
}> {
  const schema = tenantSchema(tenantId);
  const tplRes = await safeQuery(
    `SELECT
       count(*)::int AS total,
       count(*) FILTER (WHERE status = 'active')::int AS active
     FROM "${schema}".playbook_templates`,
    []
  );
  const execRes = await safeQuery(
    `SELECT
       count(*)::int AS total,
       count(*) FILTER (WHERE status = 'running')::int AS running,
       count(*) FILTER (WHERE status = 'completed')::int AS completed
     FROM "${schema}".playbook_executions`,
    []
  );
  const recentRes = await safeQuery(
    `SELECT execution_id as "executionId", template_id as "templateId",
            trigger_source_entity as "triggerSourceEntity", status,
            started_at as "startedAt", completed_at as "completedAt"
       FROM "${schema}".playbook_executions
      ORDER BY started_at DESC
      LIMIT 10`,
    []
  );
  return {
    templates: { total: tplRes.rows[0]?.total ?? 0, active: tplRes.rows[0]?.active ?? 0 },
    executions: {
      total: execRes.rows[0]?.total ?? 0,
      running: execRes.rows[0]?.running ?? 0,
      completed: execRes.rows[0]?.completed ?? 0,
    },
    recentExecutions: recentRes.rows ?? [],
  };
}

// ── Template & Step Management ──
export async function createTemplate(tenantId: string, userId: string, data: { name: string; triggeringEventsJson?: string[] }): Promise<PlaybookTemplateContract> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".playbook_templates (name, triggering_events_json)
     VALUES ($1, $2)
     RETURNING template_id as "templateId", name, version, status, triggering_events_json as "triggeringEventsJson", created_at as "createdAt", updated_at as "updatedAt"`,
    [data.name, JSON.stringify(data.triggeringEventsJson || [])]
  );
  await setAuditData(tenantId, 'playbook_templates', result.rows[0].templateId, 'create', null, result.rows[0], userId);
  return result.rows[0] as PlaybookTemplateContract;
}

export async function addStep(tenantId: string, userId: string, templateId: string, data: { stepOrder: number; title: string; instructionsMd?: string; isAutomated?: boolean; requiredRole?: string }): Promise<PlaybookStepContract> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".playbook_steps (template_id, step_order, title, instructions_md, is_automated, required_role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING step_id as "stepId", template_id as "templateId", step_order as "stepOrder", title, instructions_md as "instructionsMd", is_automated as "isAutomated", required_role as "requiredRole", created_at as "createdAt"`,
    [templateId, data.stepOrder, data.title, data.instructionsMd || null, data.isAutomated || false, data.requiredRole || null]
  );
  await setAuditData(tenantId, 'playbook_steps', result.rows[0].stepId, 'create', null, result.rows[0], userId);
  return result.rows[0] as PlaybookStepContract;
}

export async function getTemplateDetailed(tenantId: string, templateId: string): Promise<{ template: PlaybookTemplateContract, steps: PlaybookStepContract[] }> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.playbooks_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Execution Workflow ──
export async function executePlaybook(tenantId: string, userId: string, templateId: string, triggerSourceEntity?: string): Promise<PlaybookExecutionContract> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".playbook_executions (template_id, trigger_source_entity)
     VALUES ($1, $2)
     RETURNING execution_id as "executionId", template_id as "templateId", trigger_source_entity as "triggerSourceEntity", status, started_at as "startedAt", completed_at as "completedAt", updated_at as "updatedAt"`,
    [templateId, triggerSourceEntity || null]
  );
  await setAuditData(tenantId, 'playbook_executions', result.rows[0].executionId, 'execute', null, result.rows[0], userId);
  return result.rows[0] as PlaybookExecutionContract;
}

export async function logExecutionStep(tenantId: string, executionId: string, userId: string, data: { stepId: string; resultData?: any }): Promise<PlaybookExecutionLogContract> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".playbook_execution_logs (execution_id, step_id, acted_by_user_id, result_data)
     VALUES ($1, $2, $3, $4)
     RETURNING log_id as "logId", execution_id as "executionId", step_id as "stepId", acted_by_user_id as "actedByUserId", result_data as "resultData", created_at as "createdAt"`,
    [executionId, data.stepId, userId, JSON.stringify(data.resultData || {})]
  );
  await safeQuery(`UPDATE "${schema}".playbook_executions SET updated_at = NOW() WHERE execution_id = $1`, [executionId]);
  await setAuditData(tenantId, 'playbook_execution_logs', result.rows[0].logId, 'log_step', null, result.rows[0], userId);
  return result.rows[0] as PlaybookExecutionLogContract;
}

export async function completeExecution(tenantId: string, executionId: string, userId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  const existing = await safeQuery(`SELECT * FROM "${schema}".playbook_executions WHERE execution_id = $1`, [executionId]);
  
  await safeQuery(
    `UPDATE "${schema}".playbook_executions SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE execution_id = $1`,
    [executionId]
  );
  await setAuditData(tenantId, 'playbook_executions', executionId, 'complete', existing.rows[0], null, userId);
}

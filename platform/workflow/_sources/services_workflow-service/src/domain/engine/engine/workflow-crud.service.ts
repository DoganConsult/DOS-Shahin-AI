// ============================================
// Shahin-Ai — Workflow CRUD + Serialization
// Create, read, update workflow_definitions; serialize/
// deserialize definitions; execution detail
// ============================================

import { safeQuery, tenantSchema } from '@dos/db';
import { buildExecutionMermaid } from './workflow-mermaid.service';
import type {
  WorkflowDefinition,
  WorkflowRow,
  WorkflowStep,
  WorkflowExecution,
} from "../types/workflow-types";

// === Save Workflow ===

export async function saveWorkflow(tenantId: string, data: {
  name: string;
  definition: WorkflowDefinition;
  createdBy: string;
  workflowId?: string;
  departmentId?: string | null;
  status?: string;
  [key: string]: unknown;
}): Promise<WorkflowRow> {
  const schema = tenantSchema(tenantId);

  if (data.workflowId) {
    // Update existing — increment version
    const existing = await safeQuery(
      `SELECT version FROM "${schema}".workflow_definitions WHERE workflow_id = $1`, [data.workflowId]
    );
    if (existing.rows.length === 0) throw new Error("Workflow not found");

    const newVersion = (existing.rows[0].version || 1) + 1;
    const result = await safeQuery(
      `UPDATE "${schema}".workflow_definitions SET
        name = $1, definition = $2, version = $3, department_id = $4, updated_at = NOW()
       WHERE workflow_id = $5
       RETURNING *`,
      [data.name, JSON.stringify(data.definition), newVersion, data.departmentId ?? null, data.workflowId]
    );
    return result.rows[0] as WorkflowRow;
  }

  // Create new
  const result = await safeQuery(
    `INSERT INTO "${schema}".workflow_definitions (name, definition, created_by, department_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.name, JSON.stringify(data.definition), data.createdBy, data.departmentId ?? null]
  );
  return result.rows[0] as WorkflowRow;
}

export async function getWorkflows(tenantId: string, options?: { departmentId?: string | null }): Promise<WorkflowRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".workflow_definitions
     WHERE definition->>'type' IS DISTINCT FROM 'audit_plan'`;
  const params: (string | null)[] = [];
  if (options?.departmentId !== undefined) {
    // Show tenant-wide (department_id IS NULL) or workflow_definitions scoped to the given department
    if (options.departmentId == null || options.departmentId === "") {
      sql += ` AND department_id IS NULL`;
    } else {
      sql += ` AND (department_id IS NULL OR department_id = $1)`;
      params.push(options.departmentId);
    }
  }
  sql += ` ORDER BY updated_at DESC`;
  const result = await safeQuery(sql, params);
  return result.rows as WorkflowRow[];
}

export async function getWorkflowById(tenantId: string, workflowId: string): Promise<WorkflowRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_definitions WHERE workflow_id = $1`, [workflowId]
  );
  return (result.rows[0] as WorkflowRow) || null;
}

/** Execution detail: execution row + definition + mermaid + steps (step_log) for Control Room */
export async function getExecutionDetail(tenantId: string, executionId: string): Promise<{
  execution: WorkflowExecution;
  definition: WorkflowDefinition;
  mermaid: string;
  steps: WorkflowStep[];
} | null> {
  const schema = tenantSchema(tenantId);
  const execRes = await safeQuery(
    `SELECT we.instance_id, we.workflow_id, we.trigger_type, we.status, we.started_at, we.completed_at,
            we.step_log, we.is_simulation,
            w.name AS workflow_name, w.definition
     FROM "${schema}".workflow_instances we
     LEFT JOIN "${schema}".workflow_definitions w ON w.workflow_id = we.workflow_id
     WHERE we.instance_id = $1`,
    [executionId]
  );
  const row = execRes.rows[0];
  if (!row) return null;
  const definition = (row.definition as WorkflowDefinition) || { nodes: [], edges: [], swimlanes: [], triggers: [] };
  const stepLog: WorkflowStep[] = Array.isArray(row.step_log)
    ? row.step_log as WorkflowStep[]
    : (row.step_log ? JSON.parse(JSON.stringify(row.step_log)) as WorkflowStep[] : []);
  const mermaid = buildExecutionMermaid(definition, stepLog);
  const execution: WorkflowExecution = {
    instance_id: row.instance_id,
    workflow_id: row.workflow_id,
    workflow_name: row.workflow_name,
    trigger_type: row.trigger_type,
    status: row.status,
    started_at: row.started_at,
    completed_at: row.completed_at,
    step_log: stepLog,
    is_simulation: row.is_simulation,
  };
  return { execution, definition, mermaid, steps: stepLog };
}

/** Activity for an execution (step_log as activities list for UI) */
export async function getExecutionActivity(tenantId: string, executionId: string): Promise<{ activities: WorkflowStep[] }> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT step_log FROM "${schema}".workflow_instances WHERE instance_id = $1`, [executionId]
  );
  const row = res.rows[0];
  const stepLog: WorkflowStep[] = row?.step_log != null
    ? (Array.isArray(row.step_log) ? row.step_log as WorkflowStep[] : JSON.parse(JSON.stringify(row.step_log)) as WorkflowStep[])
    : [];
  return { activities: stepLog };
}

// === Serialize / Deserialize ===

export function serializeWorkflow(definition: WorkflowDefinition): string {
  return JSON.stringify(definition, null, 2);
}

export function deserializeWorkflow(json: string): WorkflowDefinition {
  const parsed = JSON.parse(json);
  if (!parsed.nodes || !Array.isArray(parsed.nodes)) throw new Error("Invalid workflow: nodes array required");
  if (!parsed.edges || !Array.isArray(parsed.edges)) throw new Error("Invalid workflow: edges array required");
  return parsed;
}

// ============================================
// Shahin — Remediation Service
// CRUD operations for standalone remediation
// tasks with overdue detection
// ============================================

import { v4 as uuid } from 'uuid';
import { query as _query, safeQuery, tenantSchema } from '../ports/database.port';
import { eventBus } from '../ports/events.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';

// === Remediation Task CRUD ===

export async function createRemediationTask(
  tenantId: string,
  data: {
    title: string;
    description?: string;
    linked_entity_type?: string;
    linked_entity_id?: string;
    assigned_to?: string;
    created_by?: string;
    status?: string;
    priority?: string;
    due_date?: string;
  }
): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const taskId = uuid();

  const result = await safeQuery(
    `INSERT INTO "${schema}".remediation_tasks
      (task_id, title, description, linked_entity_type, linked_entity_id,
       assigned_to, created_by, status, priority, due_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      taskId,
      data.title,
      data.description || null,
      data.linked_entity_type || null,
      data.linked_entity_id || null,
      data.assigned_to || null,
      data.created_by || null,
      data.status || 'open',
      data.priority || 'medium',
      data.due_date || null,
    ]
  );

  // EventBus: remediation.created
  try { await eventBus.publish(({ eventType: 'remediation.created', tenantId, sourceService: 'remediation', entityType: 'remediation', entityId: taskId, severity: data.priority === 'critical' ? 'critical' : data.priority === 'high' ? 'warning' : 'info', payload: { title: data.title, priority: data.priority || 'medium', linkedEntityType: data.linked_entity_type, linkedEntityId: data.linked_entity_id } } as any)); } catch { /* best-effort */ }

  try {
    const { resolveJiraConfig } = await import('../../integrations/services/integration-config-resolver.service.js');
    const jiraCfg = await resolveJiraConfig(tenantId);
    if (jiraCfg) {
      const { createJiraIssue } = await import('../../../connectors/jira-adapter.js');
      await createJiraIssue(jiraCfg, { summary: data.title, description: data.description || '', issueType: 'Task', priority: data.priority === 'critical' ? 'Highest' : data.priority === 'high' ? 'High' : 'Medium', labels: ['agrc-os', `tenant-${tenantId}`] });
    }
  } catch { /* best-effort Jira sync */ }

  return getFirstRow(result);
}

export async function getRemediationTasks(tenantId: string, scopeUser?: { userId: string; role: string; isSuperAdmin?: boolean; permissions?: string[] }): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const hasFullScope = scopeUser?.isSuperAdmin === true || (scopeUser?.permissions ?? []).includes('remediation.record.read_all');
  if (scopeUser && !hasFullScope) {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".remediation_tasks WHERE created_by = $1 OR assigned_to = $1 ORDER BY created_at DESC`,
      [scopeUser.userId]
    );
    return result.rows;
  }
  const result = await safeQuery(
    `SELECT * FROM "${schema}".remediation_tasks ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function getRemediationTaskById(
  tenantId: string,
  taskId: string
): Promise<any | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".remediation_tasks WHERE task_id = $1`,
    [taskId]
  );
  return getFirstRow(result) || null;
}

export async function updateRemediationTask(
  tenantId: string,
  taskId: string,
  data: Partial<{
    title: string;
    description: string;
    linked_entity_type: string;
    linked_entity_id: string;
    assigned_to: string;
    status: string;
    priority: string;
    due_date: string;
    completed_at: string;
  }>
): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.remediation_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function deleteRemediationTask(
  tenantId: string,
  taskId: string
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `DELETE FROM "${schema}".remediation_tasks WHERE task_id = $1 RETURNING task_id`,
    [taskId]
  );
  return result.rows.length > 0;
}

// === Overdue Detection ===

/**
 * Marks all remediation tasks as 'overdue' where:
 * - status is NOT 'completed' or 'overdue'
 * - due_date is in the past (before NOW())
 * Returns the count of tasks marked overdue.
 */
export async function checkOverdueTasks(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".remediation_tasks
     SET status = 'overdue'
     WHERE status NOT IN ('completed', 'overdue')
       AND due_date IS NOT NULL
       AND due_date < NOW()
     RETURNING task_id`
  );
  return result.rows.length;
}

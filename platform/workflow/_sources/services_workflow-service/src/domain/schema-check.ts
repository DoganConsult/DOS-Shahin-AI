/**
 * Startup schema verification for dos.workflow_* tables.
 *
 * Checks that all canonical columns exist before the service accepts traffic.
 * Prevents silent query failures from schema drift between migrations.
 */

import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';

interface ExpectedColumn {
  table: string;
  column: string;
}

const CANONICAL_COLUMNS: ExpectedColumn[] = [
  // workflow_instances
  { table: 'workflow_instances', column: 'instance_id' },
  { table: 'workflow_instances', column: 'tenant_id' },
  { table: 'workflow_instances', column: 'workflow_type' },
  { table: 'workflow_instances', column: 'name' },
  { table: 'workflow_instances', column: 'status' },
  { table: 'workflow_instances', column: 'current_step' },
  { table: 'workflow_instances', column: 'total_steps' },
  { table: 'workflow_instances', column: 'created_by' },
  { table: 'workflow_instances', column: 'entity_type' },
  { table: 'workflow_instances', column: 'entity_id' },
  { table: 'workflow_instances', column: 'context' },
  { table: 'workflow_instances', column: 'completed_at' },
  { table: 'workflow_instances', column: 'cancelled_at' },
  { table: 'workflow_instances', column: 'cancel_reason' },

  // workflow_tasks
  { table: 'workflow_tasks', column: 'task_id' },
  { table: 'workflow_tasks', column: 'tenant_id' },
  { table: 'workflow_tasks', column: 'instance_id' },
  { table: 'workflow_tasks', column: 'task_type' },
  { table: 'workflow_tasks', column: 'title' },
  { table: 'workflow_tasks', column: 'description' },
  { table: 'workflow_tasks', column: 'assigned_to' },
  { table: 'workflow_tasks', column: 'assigned_by' },
  { table: 'workflow_tasks', column: 'completed_by' },
  { table: 'workflow_tasks', column: 'outcome' },
  { table: 'workflow_tasks', column: 'notes' },
  { table: 'workflow_tasks', column: 'due_at' },
  { table: 'workflow_tasks', column: 'context' },

  // workflow_approvals
  { table: 'workflow_approvals', column: 'approval_id' },
  { table: 'workflow_approvals', column: 'tenant_id' },
  { table: 'workflow_approvals', column: 'workflow_instance_id' },
  { table: 'workflow_approvals', column: 'subject' },
  { table: 'workflow_approvals', column: 'requested_by' },
  { table: 'workflow_approvals', column: 'approvers' },
  { table: 'workflow_approvals', column: 'approved_by' },
  { table: 'workflow_approvals', column: 'rejected_by' },
  { table: 'workflow_approvals', column: 'escalated_by' },
  { table: 'workflow_approvals', column: 'escalated_to' },
  { table: 'workflow_approvals', column: 'comment' },
  { table: 'workflow_approvals', column: 'reject_reason' },
  { table: 'workflow_approvals', column: 'escalation_reason' },
  { table: 'workflow_approvals', column: 'context' },
  { table: 'workflow_approvals', column: 'resolved_at' },
];

export async function verifyWorkflowSchema(): Promise<{ ok: boolean; missing: string[] }> {
  const missing: string[] = [];

  try {
    const result = await safeQuery(
      `SELECT table_name, column_name
       FROM information_schema.columns
       WHERE table_schema = 'dos'
         AND table_name IN ('workflow_instances', 'workflow_tasks', 'workflow_approvals')`,
      [],
    );

    const existing = new Set(
      (result.rows as Array<{ table_name: string; column_name: string }>)
        .map(r => `${r.table_name}.${r.column_name}`),
    );

    for (const { table, column } of CANONICAL_COLUMNS) {
      if (!existing.has(`${table}.${column}`)) {
        missing.push(`dos.${table}.${column}`);
      }
    }

    if (missing.length > 0) {
      logger.error('[WorkflowSchemaCheck] Missing canonical columns — run migration 022', { missing });
      return { ok: false, missing };
    }

    logger.info('[WorkflowSchemaCheck] All canonical columns verified');
    return { ok: true, missing: [] };
  } catch (err) {
    logger.error('[WorkflowSchemaCheck] Schema verification failed', { error: (err as Error).message });
    return { ok: false, missing: ['QUERY_FAILED'] };
  }
}

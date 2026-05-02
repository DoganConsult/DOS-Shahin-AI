import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { WORKFLOW_STEPS } from './policy-template-catalog';
import type { GenericRow as _GenericRow } from '@dos/types';

export async function trackPolicyAction(
  tenantId: string,
  policyId: string,
  action: string,
  userId: string,
  role: string | null,
  fromStatus: string | null,
  toStatus: string | null,
  comment?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `INSERT INTO "${schema}".policy_workflow_tracker
        (policy_id, action, actor_user_id, actor_role, from_status, to_status, comment, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [policyId, action, userId, role, fromStatus, toStatus, comment || null, JSON.stringify(metadata || {})],
    );
  } catch { /* non-fatal */ }
}

export async function getPolicyWorkflowHistory(
  tenantId: string,
  policyId: string,
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".policy_workflow_tracker
       WHERE policy_id = $1 ORDER BY created_at DESC`,
      [policyId],
    );
    return result.rows;
  } catch {
    return [];
  }
}

export async function createPolicyWorkflowSteps(
  tenantId: string,
  policyId: string,
): Promise<number> {
  const schema = tenantSchema(tenantId);
  let count = 0;
  for (const step of WORKFLOW_STEPS) {
    try {
      await safeQuery(
        `INSERT INTO "${schema}".policy_process_actions
          (policy_id, step_key, step_order, status, assigned_role, sla_hours, is_required)
         VALUES ($1,$2,$3,'pending',$4,$5,$6)
         ON CONFLICT DO NOTHING`,
        [policyId, step.step_key, step.step_order, step.assigned_role, step.sla_hours, step.is_required],
      );
      count++;
    } catch { /* non-fatal */ }
  }
  return count;
}

export async function getPolicyProcessSteps(
  tenantId: string,
  policyId: string,
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".policy_process_actions
       WHERE policy_id = $1 ORDER BY step_order ASC`,
      [policyId],
    );
    return result.rows;
  } catch {
    return [];
  }
}

export async function advancePolicyStep(
  tenantId: string,
  policyId: string,
  stepKey: string,
  userId: string,
  action: 'complete' | 'skip' | 'block',
  notes?: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const statusMap = { complete: 'completed', skip: 'skipped', block: 'blocked' };
  const newStatus = statusMap[action];

  try {
    await safeQuery(
      `UPDATE "${schema}".policy_process_actions
       SET status = $1, completed_by = $2, completed_at = NOW(), notes = $3, updated_at = NOW()
       WHERE policy_id = $4 AND step_key = $5`,
      [newStatus, userId, notes || null, policyId, stepKey],
    );

    if (action === 'complete') {
      const next = await safeQuery(
        `SELECT step_key FROM "${schema}".policy_process_actions
         WHERE policy_id = $1 AND step_order > (
           SELECT step_order FROM "${schema}".policy_process_actions WHERE policy_id = $1 AND step_key = $2
         ) AND status = 'pending' AND is_required = TRUE
         ORDER BY step_order ASC LIMIT 1`,
        [policyId, stepKey],
      );
      if (next.rows.length > 0) {
        await safeQuery(
          `UPDATE "${schema}".policy_process_actions SET status = 'in_progress', updated_at = NOW()
           WHERE policy_id = $1 AND step_key = $2`,
          [policyId, getFirstRow(next)?.step_key],
        );
      }
    }

    await trackPolicyAction(tenantId, policyId, action === 'complete' ? 'approved' : action === 'skip' ? 'updated' : 'rejected',
      userId, null, stepKey, newStatus, notes, { step_key: stepKey });

    return true;
  } catch {
    return false;
  }
}

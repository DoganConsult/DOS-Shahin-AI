import { safeQuery, tenantSchema } from '../ports/database.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';
import { enforceStatusTransition } from '../ports/platform.port';
import { toErrorMessage } from '@dos/module-sdk';
import { z } from 'zod';
import { vendorStatusTransitionSchema } from '../schemas/vendor.schemas';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  prospect: ['due_diligence', 'rejected'],
  due_diligence: ['onboarded', 'rejected'],
  onboarded: ['active', 'review_due'],
  active: ['review_due', 'offboarding'],
  review_due: ['active', 'offboarding'],
  offboarding: ['offboarded'],
  offboarded: [],
  rejected: [],
};

const PROTECTED_TRANSITIONS = ['onboarded', 'active', 'offboarded'];

export async function transitionStatus(
  tenantId: string, entityId: string, targetStatus: string, userId: string,
  entityType: 'vendor' = 'vendor', reason?: string,
): Promise<{ fromStatus: string; toStatus: string; approvalId?: string }> {
  // Validate input schemas
  vendorStatusTransitionSchema.parse({ entityId, fromStatus: 'unknown', toStatus: targetStatus, reason });

  const schema = tenantSchema(tenantId);
  const table = 'vendor_profiles';

  // 1. Fetch current business state
  const current = await safeQuery(`SELECT status FROM "${schema}"."${table}" WHERE id = $1`, [entityId]);
  if (current.rows.length === 0) {
    const e = new Error(`Vendor profile not found for transition`);
    (e as any).statusCode = 404;
    throw e;
  }
  const fromStatus: string = current.rows[0].status;

  // 2. Local Domain Validation
  const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(targetStatus)) {
    const e = new Error(`Cannot transition vendor from ${fromStatus} to ${targetStatus}`);
    (e as any).statusCode = 400;
    throw e;
  }

  // 3. Platform DAuth Lifecycle Gate Evaluation (Rule 3.1)
  await enforceStatusTransition(tenantId, 'vendor', entityId, fromStatus, targetStatus, userId);

  // 4. Protected Transition Routing (Rule 3.2)
  if (PROTECTED_TRANSITIONS.includes(targetStatus)) {
    try {
      const workflowContext = { tenantId, entityId, fromStatus, targetStatus, reason, requestedBy: userId };
      // Simulate mapping to proper Temporal abstraction
      const approval = await safeQuery(
        `INSERT INTO "${schema}".approval_requests (tenant_id, module, entity_id, workflow_type, payload, status, created_by)
         VALUES ($1, 'vendor', $2, 'state_transition', $3, 'pending', $4) RETURNING id`,
        [tenantId, entityId, JSON.stringify(workflowContext), userId]
      );
      
      // We block actual mutation until approval loop resolves via cross-module chain handler
      return { fromStatus, toStatus: 'pending_approval', approvalId: approval.rows[0].id };
    } catch (e) {
      throw new Error(`Failed to initiate protected approval routing: ${toErrorMessage(e)}`);
    }
  }

  // 5. Standard Mutation (if not protected)
  await safeQuery(`UPDATE "${schema}"."${table}" SET status = $1, updated_at = NOW() WHERE id = $2`, [targetStatus, entityId]);

  // 6. Canonical Audit Linking
  await safeQuery(
    `INSERT INTO "${schema}".vendor_lifecycle_logs (tenant_id, vendor_id, action, actor_id, from_status, to_status, comments) 
     VALUES ($1, $2, 'transition', $3, $4, $5, $6)`,
    [tenantId, entityId, userId, fromStatus, targetStatus, reason || null],
  ).catch(catchHandler(EC.FALLBACK_QUERY));

  return { fromStatus, toStatus: targetStatus };
}

export async function bulkTransitionStatus(
  tenantId: string, entityIds: string[], targetStatus: string, userId: string,
): Promise<{ succeeded: string[]; failed: Array<{ id: string; error: string }> }> {
  const succeeded: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];
  for (const id of entityIds) {
    try { 
      await transitionStatus(tenantId, id, targetStatus, userId); 
      succeeded.push(id); 
    } catch (e) { 
      failed.push({ id, error: toErrorMessage(e) }); 
    }
  }
  return { succeeded, failed };
}

export async function getStatusHistory(tenantId: string, entityId: string) {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT from_status AS "fromStatus", to_status AS "toStatus", actor_id AS "changedBy", created_at AS "changedAt", comments 
     FROM "${schema}".vendor_lifecycle_logs 
     WHERE vendor_id = $1 AND action = 'transition' ORDER BY created_at ASC`,
    [entityId],
  );
  return result.rows;
}

export async function getLifecycleState(tenantId: string, entityId: string) {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(`SELECT id, status, created_at FROM "${schema}".vendor_profiles WHERE id = $1`, [entityId]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    
    // Abstract SLA calculation logic representing complex business rules
    const slaHours = row.status === 'due_diligence' ? 168 : 336; 
    const elapsed = (Date.now() - new Date(row.created_at).getTime()) / 3600000;
    const remaining = Math.max(0, slaHours - elapsed);
    
    return { 
      entityId, 
      status: row.status, 
      slaHours, 
      remainingHours: Math.round(remaining * 10) / 10, 
      breached: remaining <= 0 
    };
  } catch { return null; }
}

export async function getAvailableTransitions(currentState: string): Promise<string[]> {
  return ALLOWED_TRANSITIONS[currentState] ?? [];
}

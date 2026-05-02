import { safeQuery, tenantSchema } from '@dos/db';

export interface AgentSodDelegationCheck {
  tenantId: string;
  agentId: string;
  principalId: string;
  actionType: string;
  entityType?: string;
  entityId?: string | null;
  requiredPermissions?: string[];
}

export async function checkAgentSodDelegation(input: AgentSodDelegationCheck): Promise<{ allowed: boolean; reason?: string }> {
  const isApproval =
    input.actionType.toLowerCase().includes('approve') ||
    (input.requiredPermissions ?? []).some(p => p.toLowerCase().includes('.approve'));

  if (!isApproval) return { allowed: true };

  const entityType = input.entityType;
  const entityId = input.entityId ?? null;
  if (!entityType || !entityId) return { allowed: true };

  const schema = tenantSchema(input.tenantId);

  const prior = await safeQuery(
    `SELECT action_id
       FROM "${schema}".delegation_actions
      WHERE tenant_id = $1
        AND user_id = $2
        AND entity_type = $3
        AND entity_id = $4
        AND result = 'success'
        AND action_type LIKE 'copilot.%'
        AND action_type NOT ILIKE '%approve%'
      ORDER BY executed_at DESC
      LIMIT 1`,
    [input.tenantId, input.principalId, entityType, entityId],
  );

  if (prior.rows.length > 0) {
    return { allowed: false, reason: 'delegated_self_approval_prevented' };
  }

  return { allowed: true };
}

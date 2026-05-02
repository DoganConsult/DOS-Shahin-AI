// ============================================================================
// Shahin — Governance Baseline Seeders: Delegations
// Seeds authority delegations from authority_matrix entries.
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { uuid as _uuid, getTenantAdmin } from './_shared';

export async function seedDelegations(
  tenantId: string,
): Promise<{ seeded: number }> {
  const schema = tenantSchema(tenantId);
  let seeded = 0;
  const adminId = await getTenantAdmin(tenantId);
  if (!adminId) return { seeded: 0 };

  // Query authority_matrix entries from governance constitution
  const authorities = await safeQuery(
    `SELECT decision_type, required_approver_role, escalation_timeout_hours
     FROM "${schema}".authority_matrix WHERE is_active = TRUE`,
  );

  for (const auth of authorities.rows) {
    const exists = await safeQuery(
      `SELECT 1 FROM "${schema}".governance_delegations
       WHERE authority_type = $1 AND delegator_user_id = $2 AND deleted_at IS NULL LIMIT 1`,
      [auth.decision_type, adminId],
    );
    if (exists.rows.length > 0) continue;

    // Find a user with the required approver role
    const delegate = await safeQuery(
      `SELECT user_id FROM public.users
       WHERE tenant_id = $1 AND role = $2 AND status = 'active'
       ORDER BY created_at ASC LIMIT 1`,
      [tenantId, auth.required_approver_role],
    );
    const delegateId = getFirstRow(delegate)?.user_id || adminId;

    await safeQuery(
      `INSERT INTO "${schema}".governance_delegations
         (tenant_id, delegator_user_id, delegate_user_id, authority_type,
          scope_description, status, effective_date, expiry_date, created_by)
       VALUES ($1, $2, $3, $4, $5, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', $6)`,
      [
        tenantId, adminId, delegateId, auth.decision_type,
        `Delegated authority for ${auth.decision_type} decisions`,
        adminId,
      ],
    );
    seeded++;
  }

  return { seeded };
}

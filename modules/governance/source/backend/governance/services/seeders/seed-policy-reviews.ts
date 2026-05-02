// ============================================================================
// Shahin — Governance Baseline Seeders: Policy Reviews & Acknowledgement Campaigns
// Seeds initial policy reviews and acknowledgement campaigns for approved policies.
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getTenantAdmin } from './_shared';

export async function seedPolicyReviews(
  tenantId: string,
): Promise<{ seeded: number }> {
  const schema = tenantSchema(tenantId);
  let seeded = 0;
  const adminId = await getTenantAdmin(tenantId);

  const policies = await safeQuery(
    `SELECT policy_id, title FROM "${schema}".policies WHERE deleted_at IS NULL LIMIT 10`,
  );

  for (const p of policies.rows) {
    const exists = await safeQuery(
      `SELECT 1 FROM "${schema}".governance_policy_reviews
       WHERE policy_id = $1 LIMIT 1`,
      [p.policy_id],
    );
    if (exists.rows.length > 0) continue;

    await safeQuery(
      `INSERT INTO "${schema}".governance_policy_reviews
         (policy_id, reviewer_id, review_type, outcome, comments, next_review_date)
       VALUES ($1, $2, 'periodic', 'approved', $3, NOW() + INTERVAL '6 months')`,
      [p.policy_id, adminId, `Initial review completed for ${p.title || p.policy_id}. Policy meets current regulatory requirements.`],
    );
    seeded++;
  }

  return { seeded };
}

export async function seedAcknowledgementCampaigns(
  tenantId: string,
): Promise<{ seeded: number }> {
  const schema = tenantSchema(tenantId);
  let seeded = 0;

  const policies = await safeQuery(
    `SELECT policy_id, title FROM "${schema}".policies
     WHERE status = 'approved' AND deleted_at IS NULL LIMIT 5`,
  );

  for (const p of policies.rows) {
    const exists = await safeQuery(
      `SELECT 1 FROM "${schema}".governance_ack_campaigns
       WHERE policy_id = $1 LIMIT 1`,
      [p.policy_id],
    );
    if (exists.rows.length > 0) continue;

    await safeQuery(
      `INSERT INTO "${schema}".governance_ack_campaigns
         (tenant_id, policy_id, title, due_date, created_by)
       VALUES ($1, $2, $3, CURRENT_DATE + INTERVAL '30 days', 'auto-fire')`,
      [tenantId, p.policy_id, `Acknowledge: ${p.title || p.policy_id}`],
    );
    seeded++;
  }

  return { seeded };
}

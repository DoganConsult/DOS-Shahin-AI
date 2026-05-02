// ============================================================================
// Shahin — Governance Baseline Seeders: Committees
// Seeds baseline governance committees with chairs and charters.
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { uuid, getTenantAdmin } from './_shared';

const BASELINE_COMMITTEES = [
  {
    name: 'Board Governance Committee',
    name_ar: 'لجنة الحوكمة',
    purpose: 'Strategic oversight of governance framework, risk appetite, and compliance posture',
    meeting_schedule: 'quarterly',
    charter_scope: 'Enterprise-wide governance oversight',
  },
  {
    name: 'Audit Committee',
    name_ar: 'لجنة المراجعة',
    purpose: 'Independent oversight of internal/external audit activities and financial controls',
    meeting_schedule: 'quarterly',
    charter_scope: 'Internal/external audit oversight and financial reporting',
  },
  {
    name: 'Risk Management Committee',
    name_ar: 'لجنة إدارة المخاطر',
    purpose: 'Risk appetite monitoring, risk treatment plan approval, and emerging risk identification',
    meeting_schedule: 'monthly',
    charter_scope: 'Enterprise risk management and treatment oversight',
  },
  {
    name: 'Compliance Committee',
    name_ar: 'لجنة الامتثال',
    purpose: 'Regulatory compliance monitoring, policy enforcement, and regulatory change management',
    meeting_schedule: 'monthly',
    charter_scope: 'Regulatory compliance and policy lifecycle management',
  },
];

export async function seedCommittees(
  tenantId: string,
  userId?: string,
): Promise<{ seeded: number; skipped: number }> {
  const schema = tenantSchema(tenantId);
  const adminId = userId || (await getTenantAdmin(tenantId)) || 'system';
  let seeded = 0;
  let skipped = 0;

  for (const c of BASELINE_COMMITTEES) {
    // Idempotency: check by name
    const exists = await safeQuery(
      `SELECT committee_id FROM "${schema}".committees WHERE name = $1 AND deleted_at IS NULL LIMIT 1`,
      [c.name],
    );
    if (exists.rows.length > 0) { skipped++; continue; }

    const committeeId = uuid();
    await safeQuery(
      `INSERT INTO "${schema}".committees (committee_id, name, purpose, members, meeting_schedule)
       VALUES ($1, $2, $3, $4, $5)`,
      [committeeId, c.name, c.purpose, [], c.meeting_schedule],
    );

    // Add admin as chair
    await safeQuery(
      `INSERT INTO "${schema}".governance_committee_members
         (committee_id, user_id, role_in_committee, is_chair, voting_rights, created_by)
       VALUES ($1, $2, 'chair', TRUE, TRUE, $3)
       ON CONFLICT (committee_id, user_id) DO NOTHING`,
      [committeeId, adminId, adminId],
    );

    // Seed charter
    await safeQuery(
      `INSERT INTO "${schema}".governance_charters
         (committee_id, tenant_id, title_en, title_ar, purpose, scope, status, activated_at, expiry_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW(), NOW() + INTERVAL '1 year', $7)`,
      [committeeId, tenantId, `${c.name} Charter`, `ميثاق ${c.name_ar}`, c.purpose, c.charter_scope, adminId],
    );

    seeded++;
  }

  return { seeded, skipped };
}

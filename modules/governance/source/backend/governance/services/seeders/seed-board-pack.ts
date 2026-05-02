// ============================================================================
// Shahin — Governance Baseline Seeders: Board Pack & Executive Summary
// Seeds quarterly board pack with items and monthly executive summary.
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { uuid, getTenantAdmin } from './_shared';

export async function seedBoardPack(
  tenantId: string,
): Promise<{ seeded: number; items: number }> {
  const schema = tenantSchema(tenantId);
  const adminId = await getTenantAdmin(tenantId);

  const exists = await safeQuery(
    `SELECT 1 FROM "${schema}".board_packs LIMIT 1`,
  );
  if (exists.rows.length > 0) return { seeded: 0, items: 0 };

  const packId = uuid();
  await safeQuery(
    `INSERT INTO "${schema}".board_packs
       (pack_id, tenant_id, title_en, title_ar, meeting_date, status, prepared_by)
     VALUES ($1, $2, 'Quarterly Governance Board Pack', 'حزمة مجلس الإدارة الفصلية', NOW() + INTERVAL '30 days', 'draft', $3)`,
    [packId, tenantId, adminId],
  );

  const PACK_ITEMS = [
    { type: 'governance_health', title: 'Governance Health Score Summary', sort: 1 },
    { type: 'risk_posture', title: 'Enterprise Risk Posture Overview', sort: 2 },
    { type: 'compliance_status', title: 'Regulatory Compliance Status', sort: 3 },
    { type: 'action_tracker', title: 'Governance Action Items Tracker', sort: 4 },
    { type: 'audit_findings', title: 'Open Audit Findings Summary', sort: 5 },
    { type: 'incident_summary', title: 'Security Incident Summary', sort: 6 },
    { type: 'committee_decisions', title: 'Key Committee Decisions', sort: 7 },
    { type: 'kpi_dashboard', title: 'GRC KPI Dashboard', sort: 8 },
  ];

  for (const item of PACK_ITEMS) {
    await safeQuery(
      `INSERT INTO "${schema}".board_pack_items
         (pack_id, item_type, title, content, sort_order, source_entity_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [packId, item.type, item.title, JSON.stringify({ auto_generated: true, description: `Auto-populated ${item.title.toLowerCase()}` }), item.sort, item.type],
    );
  }

  return { seeded: 1, items: PACK_ITEMS.length };
}

export async function seedExecutiveSummary(
  tenantId: string,
): Promise<{ seeded: number }> {
  const schema = tenantSchema(tenantId);
  const adminId = await getTenantAdmin(tenantId);

  const exists = await safeQuery(
    `SELECT 1 FROM "${schema}".governance_executive_summaries LIMIT 1`,
  );
  if (exists.rows.length > 0) return { seeded: 0 };

  await safeQuery(
    `INSERT INTO "${schema}".governance_executive_summaries
       (tenant_id, title_en, title_ar, period_start, period_end, summary_type, status,
        content, highlights, key_risks, key_decisions, recommendations, prepared_by)
     VALUES ($1, $2, $3, NOW() - INTERVAL '30 days', NOW(), 'monthly', 'draft',
             $4, $5, $6, $7, $8, $9)`,
    [
      tenantId,
      'Monthly Governance Executive Summary',
      'ملخص الحوكمة التنفيذي الشهري',
      JSON.stringify({ overview: 'Governance posture summary for the reporting period. Key areas include policy lifecycle, risk management, compliance monitoring, and audit assurance.' }),
      'Governance framework established. RACI matrix populated. Committees formed with charters. Risk appetite defined. Procedures documented across 8 GRC domains.',
      'Policy review backlog. Evidence collection gaps for some controls. Vendor risk assessment coverage below target.',
      'Risk appetite framework approved. Information security policy updated. Quarterly audit plan finalized.',
      'Prioritize policy review completion. Accelerate evidence collection automation. Schedule vendor risk reassessments for critical vendors.',
      adminId,
    ],
  );

  return { seeded: 1 };
}

// ============================================================================
// Shahin — Governance Baseline Seeders: Responsibilities
// Seeds baseline governance responsibilities with team assignments.
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { uuid, getTenantAdmin as _getTenantAdmin } from './_shared';

const BASELINE_RESPONSIBILITIES = [
  { title_en: 'Information Security Governance', title_ar: 'حوكمة أمن المعلومات', category: 'security', criticality: 'critical' },
  { title_en: 'Regulatory Compliance Management', title_ar: 'إدارة الامتثال التنظيمي', category: 'compliance', criticality: 'critical' },
  { title_en: 'Risk Assessment & Treatment', title_ar: 'تقييم ومعالجة المخاطر', category: 'risk', criticality: 'high' },
  { title_en: 'Internal Audit Execution', title_ar: 'تنفيذ التدقيق الداخلي', category: 'audit', criticality: 'high' },
  { title_en: 'Vendor Risk Oversight', title_ar: 'الإشراف على مخاطر الموردين', category: 'vendor', criticality: 'high' },
  { title_en: 'Incident Response Coordination', title_ar: 'تنسيق الاستجابة للحوادث', category: 'incident', criticality: 'critical' },
  { title_en: 'Data Protection & Privacy', title_ar: 'حماية البيانات والخصوصية', category: 'privacy', criticality: 'high' },
  { title_en: 'Business Continuity Planning', title_ar: 'تخطيط استمرارية الأعمال', category: 'bcm', criticality: 'high' },
  { title_en: 'Policy Lifecycle Management', title_ar: 'إدارة دورة حياة السياسات', category: 'governance', criticality: 'medium' },
  { title_en: 'Board Reporting & Communication', title_ar: 'إعداد تقارير مجلس الإدارة', category: 'governance', criticality: 'high' },
];

/** Maps responsibility category to team code */
const RESP_TEAM_MAP: Record<string, string> = {
  security: 'CYBER_GOV', compliance: 'CYBER_GOV', risk: 'ERM',
  audit: 'AUDIT', vendor: 'VENDOR_RISK', incident: 'SOC_OPS',
  privacy: 'PRIVACY', bcm: 'BCM_DR', governance: 'EXEC_STRATEGY',
};

export async function seedResponsibilities(
  tenantId: string,
): Promise<{ seeded: number; assignments: number }> {
  const schema = tenantSchema(tenantId);
  let seeded = 0, assignments = 0;

  // Load team map for assignments
  const teamsRes = await safeQuery(
    `SELECT team_id, team_code FROM "${schema}".teams WHERE active = TRUE`,
  );
  const teamMap = new Map<string, string>();
  for (const t of teamsRes.rows) teamMap.set(t.team_code, t.team_id);

  for (const r of BASELINE_RESPONSIBILITIES) {
    const exists = await safeQuery(
      `SELECT responsibility_id FROM "${schema}".governance_responsibilities
       WHERE title_en = $1 AND deleted_at IS NULL LIMIT 1`,
      [r.title_en],
    );
    if (exists.rows.length > 0) continue;

    const respId = uuid();
    await safeQuery(
      `INSERT INTO "${schema}".governance_responsibilities
         (responsibility_id, tenant_id, title_en, title_ar, description, category, criticality)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [respId, tenantId, r.title_en, r.title_ar, `Responsible for ${r.title_en.toLowerCase()} across the organization`, r.category, r.criticality],
    );
    seeded++;

    // Assign to team
    const teamCode = RESP_TEAM_MAP[r.category];
    const teamId = teamMap.get(teamCode || '');
    if (teamId) {
      await safeQuery(
        `INSERT INTO "${schema}".governance_responsibility_assignments
           (responsibility_id, assignee_type, assignee_id, scope_type, scope_id)
         VALUES ($1, 'team', $2, 'enterprise', 'all')
         ON CONFLICT DO NOTHING`,
        [respId, teamId],
      );
      assignments++;
    }
  }

  return { seeded, assignments };
}

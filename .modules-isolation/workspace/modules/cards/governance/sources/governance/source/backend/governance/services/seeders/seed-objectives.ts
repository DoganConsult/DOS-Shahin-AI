// ============================================================================
// Shahin — Governance Baseline Seeders: Objectives
// Seeds baseline governance objectives with target dates and categories.
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getTenantAdmin } from './_shared';

const BASELINE_OBJECTIVES = [
  { title_en: 'Achieve full regulatory compliance', title_ar: 'تحقيق الامتثال التنظيمي الكامل', category: 'compliance', months: 6, description: 'Close all compliance gaps and achieve full conformity with applicable regulatory frameworks' },
  { title_en: 'Implement risk treatment plans for all high risks', title_ar: 'تنفيذ خطط معالجة المخاطر العالية', category: 'risk', months: 3, description: 'Complete risk treatment implementation for all risks rated high or critical' },
  { title_en: 'Complete policy review cycle', title_ar: 'إكمال دورة مراجعة السياسات', category: 'governance', months: 6, description: 'Review and update all organizational policies within the defined review cadence' },
  { title_en: 'Establish evidence collection automation', title_ar: 'تأسيس أتمتة جمع الأدلة', category: 'assurance', months: 3, description: 'Automate evidence collection for all critical controls via scheduled evidence requests' },
  { title_en: 'Complete vendor risk assessment program', title_ar: 'إكمال برنامج تقييم مخاطر الموردين', category: 'third_party', months: 6, description: 'Assess all critical and high-risk vendors and implement continuous monitoring' },
  { title_en: 'Achieve governance maturity score above 70%', title_ar: 'تحقيق نضج الحوكمة أعلى من 70٪', category: 'maturity', months: 12, description: 'Improve governance health score across all 8 dimensions to achieve overall maturity above 70%' },
];

export async function seedObjectives(
  tenantId: string,
): Promise<{ seeded: number }> {
  const schema = tenantSchema(tenantId);
  let seeded = 0;
  const adminId = await getTenantAdmin(tenantId);

  for (const obj of BASELINE_OBJECTIVES) {
    const exists = await safeQuery(
      `SELECT 1 FROM "${schema}".governance_objectives
       WHERE title_en = $1 AND deleted_at IS NULL LIMIT 1`,
      [obj.title_en],
    );
    if (exists.rows.length > 0) continue;

    await safeQuery(
      `INSERT INTO "${schema}".governance_objectives
         (title_en, title_ar, description, category, target_date, owner_id, status, progress_percent, created_by)
       VALUES ($1, $2, $3, $4, NOW() + $5::INTERVAL, $6, 'active', 0, $7)`,
      [
        obj.title_en, obj.title_ar, obj.description, obj.category,
        `${obj.months} months`, adminId, adminId || 'system',
      ],
    );
    seeded++;
  }

  return { seeded };
}

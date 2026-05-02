// ============================================================================
// Shahin — Governance Baseline Seeders: Mandates & Obligations
// Seeds framework-linked mandates with corresponding regulatory obligations.
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { uuid } from './_shared';

export async function seedMandates(
  tenantId: string,
): Promise<{ seeded: number }> {
  const schema = tenantSchema(tenantId);
  let seeded = 0;

  // Get frameworks already seeded in tenant
  const frameworks = await safeQuery(
    `SELECT framework_code, framework_name_en FROM "${schema}".frameworks WHERE deleted_at IS NULL`,
  );

  for (const fw of frameworks.rows) {
    const mandateTitle = `${fw.framework_name_en} Compliance Mandate`;
    const exists = await safeQuery(
      `SELECT 1 FROM "${schema}".governance_mandates
       WHERE title_en = $1 AND deleted_at IS NULL LIMIT 1`,
      [mandateTitle],
    );
    if (exists.rows.length > 0) continue;

    const mandateId = uuid();
    await safeQuery(
      `INSERT INTO "${schema}".governance_mandates
         (mandate_id, tenant_id, title_en, title_ar, issuing_authority, jurisdiction,
          priority, status, effective_date, expiry_date, description, created_by)
       VALUES ($1, $2, $3, $4, $5, 'SAU', 'high', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '2 years', $6, 'system')`,
      [
        mandateId, tenantId, mandateTitle,
        `تفويض الامتثال: ${fw.framework_code}`,
        fw.framework_code,
        `Maintain full compliance with ${fw.framework_name_en} framework requirements`,
      ],
    );

    // Create linked obligation
    await safeQuery(
      `INSERT INTO "${schema}".governance_obligations
         (tenant_id, mandate_id, title_en, title_ar, description, obligation_type, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'regulatory', 'active', 'system')`,
      [
        tenantId, mandateId,
        `Maintain ${fw.framework_code} compliance`,
        `الحفاظ على الامتثال: ${fw.framework_code}`,
        `Ensure ongoing compliance with all ${fw.framework_name_en} controls and requirements`,
      ],
    );

    seeded++;
  }

  return { seeded };
}

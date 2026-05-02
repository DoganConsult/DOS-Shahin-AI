// ============================================================================
// Shahin — Governance Baseline Seeders: Structure
// Seeds governance domains, bodies, reporting lines, legal entities, departments.
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { uuid, getTenantAdmin } from './_shared';

export async function seedGovernanceStructure(
  tenantId: string,
): Promise<{ domains: number; bodies: number; reportingLines: number; legalEntities: number; departments: number }> {
  const schema = tenantSchema(tenantId);
  let domains = 0, bodies = 0, reportingLines = 0;
  const adminId = await getTenantAdmin(tenantId);

  const DOMAINS = [
    { name_en: 'Enterprise Governance', name_ar: 'الحوكمة المؤسسية', sort: 1 },
    { name_en: 'Risk Management', name_ar: 'إدارة المخاطر', sort: 2 },
    { name_en: 'Compliance & Regulatory', name_ar: 'الامتثال والتنظيم', sort: 3 },
    { name_en: 'Information Security', name_ar: 'أمن المعلومات', sort: 4 },
    { name_en: 'Audit & Assurance', name_ar: 'التدقيق والتأكيد', sort: 5 },
    { name_en: 'Business Continuity', name_ar: 'استمرارية الأعمال', sort: 6 },
  ];

  const domainIds: string[] = [];
  for (const d of DOMAINS) {
    const exists = await safeQuery(
      `SELECT domain_id FROM "${schema}".governance_domains WHERE name_en = $1 LIMIT 1`,
      [d.name_en],
    );
    if (exists.rows.length > 0) { domainIds.push(getFirstRow(exists)?.domain_id); continue; }

    const domainId = uuid();
    await safeQuery(
      `INSERT INTO "${schema}".governance_domains
         (domain_id, tenant_id, name_en, name_ar, description, owner_id, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [domainId, tenantId, d.name_en, d.name_ar, `${d.name_en} governance domain`, adminId, d.sort],
    );
    domainIds.push(domainId);
    domains++;
  }

  // Bodies under domains
  const BODIES = [
    { domain_idx: 0, body_type: 'board', name_en: 'Board of Directors', name_ar: 'مجلس الإدارة' },
    { domain_idx: 0, body_type: 'committee', name_en: 'Governance Committee', name_ar: 'لجنة الحوكمة' },
    { domain_idx: 1, body_type: 'committee', name_en: 'Risk Committee', name_ar: 'لجنة المخاطر' },
    { domain_idx: 2, body_type: 'committee', name_en: 'Compliance Committee', name_ar: 'لجنة الامتثال' },
    { domain_idx: 3, body_type: 'committee', name_en: 'Information Security Committee', name_ar: 'لجنة أمن المعلومات' },
    { domain_idx: 4, body_type: 'committee', name_en: 'Audit Committee', name_ar: 'لجنة التدقيق' },
    { domain_idx: 5, body_type: 'working_group', name_en: 'BCM Working Group', name_ar: 'فريق عمل استمرارية الأعمال' },
  ];

  const bodyIds: string[] = [];
  for (const b of BODIES) {
    const exists = await safeQuery(
      `SELECT body_id FROM "${schema}".governance_bodies WHERE name_en = $1 LIMIT 1`,
      [b.name_en],
    );
    if (exists.rows.length > 0) { bodyIds.push(getFirstRow(exists)?.body_id); continue; }

    const bodyId = uuid();
    await safeQuery(
      `INSERT INTO "${schema}".governance_bodies
         (body_id, tenant_id, domain_id, body_type, name_en, name_ar, description, chair_user_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')`,
      [bodyId, tenantId, domainIds[b.domain_idx], b.body_type, b.name_en, b.name_ar, `${b.name_en} — governance body`, adminId],
    );
    bodyIds.push(bodyId);
    bodies++;
  }

  // Reporting lines: All committees report to board
  if (bodyIds.length >= 2) {
    const boardId = bodyIds[0]; // Board of Directors
    for (let i = 1; i < bodyIds.length; i++) {
      const res = await safeQuery(
        `INSERT INTO "${schema}".governance_reporting_lines
           (tenant_id, parent_body_id, child_body_id, relationship_type)
         VALUES ($1, $2, $3, 'reports_to')
         ON CONFLICT DO NOTHING`,
        [tenantId, boardId, bodyIds[i]],
      );
      if (res.rowCount && res.rowCount > 0) reportingLines++;
    }
  }

  // Legal entities
  let legalEntities = 0;
  const LEGAL_ENTITIES = [
    { name_en: 'Holding Company', name_ar: 'الشركة القابضة', entity_type: 'holding', country: 'SA', description: 'Parent holding entity' },
    { name_en: 'Operations Subsidiary', name_ar: 'الفرع التشغيلي', entity_type: 'subsidiary', country: 'SA', description: 'Primary operations entity' },
    { name_en: 'Technology Branch', name_ar: 'فرع التكنولوجيا', entity_type: 'branch', country: 'SA', description: 'Technology and digital services' },
  ];

  for (const le of LEGAL_ENTITIES) {
    const res = await safeQuery(
      `INSERT INTO "${schema}".legal_entities (name_en, name_ar, entity_type, country, description)
       SELECT $1, $2, $3, $4, $5
       WHERE NOT EXISTS (SELECT 1 FROM "${schema}".legal_entities WHERE name_en = $1 AND deleted_at IS NULL)`,
      [le.name_en, le.name_ar, le.entity_type, le.country, le.description],
    );
    if (res.rowCount && res.rowCount > 0) legalEntities++;
  }

  // Ensure a default business unit exists for department FK
  let defaultBuId: string | null = null;
  const buCheck = await safeQuery(`SELECT bu_id FROM "${schema}".business_units WHERE deleted_at IS NULL LIMIT 1`);
  if (buCheck.rows.length > 0) {
    defaultBuId = getFirstRow(buCheck)?.bu_id;
  } else {
    const buId = uuid();
    await safeQuery(
      `INSERT INTO "${schema}".business_units (bu_id, org_id, name_en, name_ar, code, status)
       SELECT $1, (SELECT org_id FROM "${schema}".organizations LIMIT 1), 'Main Business Unit', 'وحدة الأعمال الرئيسية', 'BU-01', 'active'
       WHERE NOT EXISTS (SELECT 1 FROM "${schema}".business_units WHERE deleted_at IS NULL)`,
      [buId],
    );
    defaultBuId = buId;
  }

  // Departments
  let departments = 0;
  if (defaultBuId) {
    const DEPARTMENTS = [
      { name_en: 'Information Technology', name_ar: 'تكنولوجيا المعلومات', code: 'IT' },
      { name_en: 'Internal Audit', name_ar: 'التدقيق الداخلي', code: 'IA' },
      { name_en: 'Risk Management', name_ar: 'إدارة المخاطر', code: 'RM' },
      { name_en: 'Compliance', name_ar: 'الامتثال', code: 'COMP' },
      { name_en: 'Legal', name_ar: 'الشؤون القانونية', code: 'LEGAL' },
      { name_en: 'Finance', name_ar: 'المالية', code: 'FIN' },
      { name_en: 'Human Resources', name_ar: 'الموارد البشرية', code: 'HR' },
      { name_en: 'Operations', name_ar: 'العمليات', code: 'OPS' },
    ];

    for (const dept of DEPARTMENTS) {
      const res = await safeQuery(
        `INSERT INTO "${schema}".departments (bu_id, name_en, name_ar, code, head_user_id)
         SELECT $1, $2, $3, $4, $5
         WHERE NOT EXISTS (SELECT 1 FROM "${schema}".departments WHERE code = $4 AND deleted_at IS NULL)`,
        [defaultBuId, dept.name_en, dept.name_ar, dept.code, adminId],
      );
      if (res.rowCount && res.rowCount > 0) departments++;
    }
  }

  return { domains, bodies, reportingLines, legalEntities, departments };
}

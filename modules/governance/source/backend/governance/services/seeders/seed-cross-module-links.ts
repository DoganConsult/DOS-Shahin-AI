// ============================================================================
// Shahin — Governance Baseline Seeders: Cross-Module Links
// Wires frameworks->mandates->obligations->controls->evidence->procedures->RACI->KPIs
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';

export async function seedCrossModuleLinks(
  tenantId: string,
): Promise<{ obligationControlLinks: number; procedureControlLinks: number; registerEntries: number; policyControlLinks: number }> {
  const schema = tenantSchema(tenantId);
  let obligationControlLinks = 0;
  let procedureControlLinks = 0;
  let registerEntries = 0;
  let policyControlLinks = 0;

  // 7a. Link obligations to controls (obligation->control via framework->controls mapping)
  const obligations = await safeQuery(
    `SELECT o.obligation_id, m.issuing_authority
     FROM "${schema}".governance_obligations o
     JOIN "${schema}".governance_mandates m ON m.mandate_id = o.mandate_id
     WHERE o.deleted_at IS NULL AND m.deleted_at IS NULL`,
  );
  for (const ob of obligations.rows) {
    // issuing_authority = framework_code -- find controls for that framework
    const controls = await safeQuery(
      `SELECT control_id FROM "${schema}".controls
       WHERE framework_id = $1 AND deleted_at IS NULL LIMIT 20`,
      [ob.issuing_authority],
    );
    for (const ctrl of controls.rows) {
      const res = await safeQuery(
        `INSERT INTO "${schema}".governance_obligation_control_links
           (obligation_id, control_id, linked_by)
         VALUES ($1, $2, 'auto-fire')
         ON CONFLICT DO NOTHING`,
        [ob.obligation_id, ctrl.control_id],
      );
      if (res.rowCount && res.rowCount > 0) obligationControlLinks++;
    }
  }

  // 7b. Link procedures to controls via process_type domain mapping
  const PROC_DOMAIN_MAP: Record<string, string[]> = {
    risk_management: ['risk'],
    compliance_monitoring: ['compliance', 'regulatory'],
    incident_response: ['incident', 'security'],
    audit_assurance: ['audit'],
    vendor_risk_assessment: ['vendor', 'third_party'],
    data_protection: ['data', 'privacy'],
    change_management: ['change'],
    bcm_disaster_recovery: ['continuity', 'disaster'],
  };

  const procedures = await safeQuery(
    `SELECT sop_id, process_type FROM "${schema}".sop_procedures WHERE status = 'active'`,
  );
  for (const proc of procedures.rows) {
    const domains = PROC_DOMAIN_MAP[proc.process_type] || [];
    if (domains.length === 0) continue;
    // Link each procedure to controls in that domain
    const domainPatterns = domains.map(d => `%${d}%`);
    for (const pattern of domainPatterns) {
      const controls = await safeQuery(
        `SELECT control_id FROM "${schema}".controls
         WHERE (domain ILIKE $1 OR title ILIKE $1) AND deleted_at IS NULL LIMIT 5`,
        [pattern],
      );
      for (const ctrl of controls.rows) {
        // Store in governance_registers as cross-reference
        const res = await safeQuery(
          `INSERT INTO "${schema}".governance_registers
             (register_type, name_en, description, owner_id, status, metadata, created_by)
           SELECT 'control', $1, $2, NULL, 'active',
                  jsonb_build_object('procedure_id', $3::TEXT, 'control_id', $4::TEXT, 'link_type', 'procedure_control'),
                  'auto-fire'
           WHERE NOT EXISTS (
             SELECT 1 FROM "${schema}".governance_registers
             WHERE metadata->>'procedure_id' = $3::TEXT AND metadata->>'control_id' = $4::TEXT
           )`,
          [
            `SOP→Control: ${proc.process_type}`,
            `Auto-linked procedure ${proc.sop_id} to control ${ctrl.control_id}`,
            String(proc.sop_id), String(ctrl.control_id),
          ],
        );
        if (res.rowCount && res.rowCount > 0) procedureControlLinks++;
      }
    }
  }

  // 7c. Create governance registers for all major entity types (cross-module index)
  const REGISTER_TYPES: Array<{ type: string; name_en: string; name_ar: string }> = [
    { type: 'risk', name_en: 'Enterprise Risk Register', name_ar: 'سجل المخاطر المؤسسية' },
    { type: 'control', name_en: 'Control Register', name_ar: 'سجل الضوابط' },
    { type: 'policy', name_en: 'Policy Register', name_ar: 'سجل السياسات' },
    { type: 'compliance', name_en: 'Compliance Obligations Register', name_ar: 'سجل التزامات الامتثال' },
    { type: 'incident', name_en: 'Incident Register', name_ar: 'سجل الحوادث' },
    { type: 'asset', name_en: 'Information Asset Register', name_ar: 'سجل أصول المعلومات' },
    { type: 'vendor', name_en: 'Vendor Risk Register', name_ar: 'سجل مخاطر الموردين' },
    { type: 'obligation', name_en: 'Regulatory Obligations Register', name_ar: 'سجل الالتزامات التنظيمية' },
    { type: 'issue', name_en: 'Issues & Findings Register', name_ar: 'سجل المشكلات والنتائج' },
  ];

  for (const reg of REGISTER_TYPES) {
    const exists = await safeQuery(
      `SELECT 1 FROM "${schema}".governance_registers
       WHERE register_type = $1 AND name_en = $2 AND deleted_at IS NULL LIMIT 1`,
      [reg.type, reg.name_en],
    );
    if (exists.rows.length > 0) continue;

    await safeQuery(
      `INSERT INTO "${schema}".governance_registers
         (register_type, name_en, name_ar, description, status, created_by)
       VALUES ($1, $2, $3, $4, 'active', 'auto-fire')`,
      [reg.type, reg.name_en, reg.name_ar, `Central ${reg.name_en.toLowerCase()} for governance oversight`],
    );
    registerEntries++;
  }

  // 7d. Link policies to controls (policies->controls via framework mapping)
  const policies = await safeQuery(
    `SELECT policy_id, frameworks FROM "${schema}".policies WHERE deleted_at IS NULL AND frameworks IS NOT NULL`,
  );
  for (const pol of policies.rows) {
    const fws = Array.isArray(pol.frameworks) ? pol.frameworks : [];
    for (const fw of fws) {
      const controls = await safeQuery(
        `SELECT control_id FROM "${schema}".controls
         WHERE framework_id = $1 AND deleted_at IS NULL LIMIT 10`,
        [fw],
      );
      for (const ctrl of controls.rows) {
        // Use governance_registers as cross-reference for policy-control links
        const res = await safeQuery(
          `INSERT INTO "${schema}".governance_registers
             (register_type, name_en, description, status, metadata, created_by)
           SELECT 'control', $1, $2, 'active',
                  jsonb_build_object('policy_id', $3::TEXT, 'control_id', $4::TEXT, 'link_type', 'policy_control'),
                  'auto-fire'
           WHERE NOT EXISTS (
             SELECT 1 FROM "${schema}".governance_registers
             WHERE metadata->>'policy_id' = $3::TEXT AND metadata->>'control_id' = $4::TEXT
           )`,
          [
            `Policy→Control: ${pol.policy_id}`,
            `Auto-linked policy ${pol.policy_id} to control ${ctrl.control_id}`,
            String(pol.policy_id), String(ctrl.control_id),
          ],
        );
        if (res.rowCount && res.rowCount > 0) policyControlLinks++;
      }
    }
  }

  return { obligationControlLinks, procedureControlLinks, registerEntries, policyControlLinks };
}

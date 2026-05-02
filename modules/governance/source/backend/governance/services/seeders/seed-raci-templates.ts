// ============================================================================
// Shahin — Governance Baseline Seeders: RACI Templates
// Seeds process-area RACI templates with role-activity assignments.
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { uuid } from './_shared';

const RACI_TEMPLATE_DEFS = [
  {
    name_en: 'Policy Lifecycle RACI', name_ar: 'مصفوفة RACI لدورة حياة السياسات',
    process_area: 'policy_lifecycle',
    activities: [
      { activity: 'Policy Drafting', R: 'compliance_officer', A: 'ciso', C: 'legal', I: 'all_staff' },
      { activity: 'Policy Review', R: 'compliance_officer', A: 'ciso', C: 'risk_manager', I: 'audit' },
      { activity: 'Policy Approval', R: 'ciso', A: 'ceo', C: 'board', I: 'all_staff' },
      { activity: 'Policy Distribution', R: 'compliance_officer', A: 'ciso', C: 'hr', I: 'all_staff' },
      { activity: 'Policy Acknowledgement', R: 'all_staff', A: 'compliance_officer', C: 'hr', I: 'audit' },
    ],
  },
  {
    name_en: 'Risk Management RACI', name_ar: 'مصفوفة RACI لإدارة المخاطر',
    process_area: 'risk_management',
    activities: [
      { activity: 'Risk Identification', R: 'risk_manager', A: 'cro', C: 'business_owners', I: 'audit' },
      { activity: 'Risk Assessment', R: 'risk_manager', A: 'cro', C: 'ciso', I: 'board' },
      { activity: 'Risk Treatment', R: 'risk_owner', A: 'risk_manager', C: 'ciso', I: 'cro' },
      { activity: 'Risk Monitoring', R: 'risk_manager', A: 'cro', C: 'audit', I: 'board' },
      { activity: 'Risk Reporting', R: 'risk_manager', A: 'cro', C: 'cfo', I: 'board' },
    ],
  },
  {
    name_en: 'Incident Response RACI', name_ar: 'مصفوفة RACI للاستجابة للحوادث',
    process_area: 'incident_response',
    activities: [
      { activity: 'Incident Detection', R: 'soc_analyst', A: 'ciso', C: 'it_ops', I: 'risk_manager' },
      { activity: 'Incident Triage', R: 'ciso', A: 'ciso', C: 'legal', I: 'ceo' },
      { activity: 'Containment', R: 'soc_analyst', A: 'ciso', C: 'it_ops', I: 'risk_manager' },
      { activity: 'Recovery', R: 'it_ops', A: 'ciso', C: 'bcm_manager', I: 'board' },
      { activity: 'Post-Incident Review', R: 'ciso', A: 'cro', C: 'audit', I: 'board' },
    ],
  },
  {
    name_en: 'Audit Lifecycle RACI', name_ar: 'مصفوفة RACI لدورة التدقيق',
    process_area: 'audit_assurance',
    activities: [
      { activity: 'Audit Planning', R: 'auditor', A: 'audit_manager', C: 'compliance_officer', I: 'board' },
      { activity: 'Fieldwork', R: 'auditor', A: 'audit_manager', C: 'control_owners', I: 'ciso' },
      { activity: 'Finding Documentation', R: 'auditor', A: 'audit_manager', C: 'control_owners', I: 'risk_manager' },
      { activity: 'Remediation Tracking', R: 'control_owners', A: 'audit_manager', C: 'risk_manager', I: 'board' },
      { activity: 'Audit Report', R: 'audit_manager', A: 'audit_committee', C: 'ceo', I: 'board' },
    ],
  },
];

export async function seedRACITemplates(
  tenantId: string,
): Promise<{ templates: number; assignments: number }> {
  const schema = tenantSchema(tenantId);
  let templates = 0, assignmentCount = 0;

  for (const tmpl of RACI_TEMPLATE_DEFS) {
    const exists = await safeQuery(
      `SELECT template_id FROM "${schema}".governance_raci_templates
       WHERE name_en = $1 LIMIT 1`,
      [tmpl.name_en],
    );
    if (exists.rows.length > 0) continue;

    const templateId = uuid();
    await safeQuery(
      `INSERT INTO "${schema}".governance_raci_templates
         (template_id, tenant_id, name_en, name_ar, process_area, status)
       VALUES ($1, $2, $3, $4, $5, 'active')`,
      [templateId, tenantId, tmpl.name_en, tmpl.name_ar, tmpl.process_area],
    );
    templates++;

    for (const act of tmpl.activities) {
      for (const [raciType, role] of [['R', act.R], ['A', act.A], ['C', act.C], ['I', act.I]] as const) {
        await safeQuery(
          `INSERT INTO "${schema}".governance_raci_assignments
             (template_id, activity, role_or_user, raci_type)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [templateId, act.activity, role, raciType],
        );
        assignmentCount++;
      }
    }
  }

  return { templates, assignments: assignmentCount };
}

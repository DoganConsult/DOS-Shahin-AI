// ============================================================================
// Shahin — Governance Baseline Seeders: Procedures
// Seeds SOP procedures (backend) and governance procedures (frontend table).
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { getTenantAdmin } from './_shared';

// ── SOP Procedures ──────────────────────────────────────────────────────

const BASELINE_PROCEDURES = [
  { process_type: 'risk_management', stage_id: 'risk_identification', role_id: 'risk_manager', title_en: 'Risk Identification Procedure', title_ar: 'إجراء تحديد المخاطر', sla_hours: 48, steps: ['Identify risk sources', 'Categorize by domain', 'Assign initial rating', 'Register in risk register'] },
  { process_type: 'risk_management', stage_id: 'risk_assessment', role_id: 'risk_manager', title_en: 'Risk Assessment & Rating Procedure', title_ar: 'إجراء تقييم المخاطر', sla_hours: 72, steps: ['Evaluate likelihood', 'Assess impact', 'Calculate risk score', 'Determine treatment strategy'] },
  { process_type: 'risk_management', stage_id: 'risk_treatment', role_id: 'risk_manager', title_en: 'Risk Treatment Plan Procedure', title_ar: 'إجراء خطة معالجة المخاطر', sla_hours: 120, steps: ['Select treatment option', 'Assign remediation owner', 'Define milestones', 'Track implementation'] },
  { process_type: 'compliance_monitoring', stage_id: 'policy_review', role_id: 'compliance_officer', title_en: 'Policy Review Procedure', title_ar: 'إجراء مراجعة السياسات', sla_hours: 168, steps: ['Assess regulatory changes', 'Review policy content', 'Update provisions', 'Route for approval'] },
  { process_type: 'compliance_monitoring', stage_id: 'gap_analysis', role_id: 'compliance_officer', title_en: 'Compliance Gap Analysis Procedure', title_ar: 'إجراء تحليل فجوات الامتثال', sla_hours: 120, steps: ['Map controls to requirements', 'Identify gaps', 'Prioritize findings', 'Create remediation tasks'] },
  { process_type: 'compliance_monitoring', stage_id: 'regulatory_change', role_id: 'compliance_officer', title_en: 'Regulatory Change Management Procedure', title_ar: 'إجراء إدارة التغييرات التنظيمية', sla_hours: 168, steps: ['Monitor regulatory updates', 'Assess impact', 'Update controls and policies', 'Notify stakeholders'] },
  { process_type: 'incident_response', stage_id: 'incident_triage', role_id: 'ciso', title_en: 'Incident Triage Procedure', title_ar: 'إجراء فرز الحوادث', sla_hours: 4, steps: ['Classify incident severity', 'Assign response team', 'Initiate containment', 'Notify stakeholders'] },
  { process_type: 'incident_response', stage_id: 'incident_containment', role_id: 'soc_analyst', title_en: 'Incident Containment Procedure', title_ar: 'إجراء احتواء الحوادث', sla_hours: 8, steps: ['Isolate affected systems', 'Preserve evidence', 'Apply temporary controls', 'Assess blast radius'] },
  { process_type: 'incident_response', stage_id: 'post_incident_review', role_id: 'ciso', title_en: 'Post-Incident Review Procedure', title_ar: 'إجراء مراجعة ما بعد الحادث', sla_hours: 168, steps: ['Conduct root cause analysis', 'Document lessons learned', 'Update playbooks', 'Close incident'] },
  { process_type: 'audit_assurance', stage_id: 'audit_planning', role_id: 'auditor', title_en: 'Audit Planning Procedure', title_ar: 'إجراء تخطيط التدقيق', sla_hours: 168, steps: ['Define audit scope', 'Identify key controls', 'Prepare audit program', 'Schedule fieldwork'] },
  { process_type: 'audit_assurance', stage_id: 'evidence_collection', role_id: 'auditor', title_en: 'Audit Evidence Collection Procedure', title_ar: 'إجراء جمع أدلة التدقيق', sla_hours: 120, steps: ['Request evidence from owners', 'Validate completeness', 'Document findings', 'Rate control effectiveness'] },
  { process_type: 'audit_assurance', stage_id: 'finding_remediation', role_id: 'auditor', title_en: 'Audit Finding Remediation Procedure', title_ar: 'إجراء معالجة نتائج التدقيق', sla_hours: 336, steps: ['Assign finding owner', 'Define remediation plan', 'Track implementation', 'Verify closure'] },
  { process_type: 'vendor_risk_assessment', stage_id: 'vendor_onboarding', role_id: 'vendor_manager', title_en: 'Vendor Onboarding Procedure', title_ar: 'إجراء تأهيل الموردين', sla_hours: 168, steps: ['Collect vendor documentation', 'Assess risk profile', 'Review security posture', 'Approve onboarding'] },
  { process_type: 'vendor_risk_assessment', stage_id: 'vendor_assessment', role_id: 'vendor_manager', title_en: 'Vendor Risk Assessment Procedure', title_ar: 'إجراء تقييم مخاطر الموردين', sla_hours: 336, steps: ['Issue assessment questionnaire', 'Review responses', 'Score vendor risk', 'Determine treatment'] },
  { process_type: 'data_protection', stage_id: 'dpia', role_id: 'dpo', title_en: 'Data Protection Impact Assessment Procedure', title_ar: 'إجراء تقييم أثر حماية البيانات', sla_hours: 336, steps: ['Identify processing activity', 'Assess necessity and proportionality', 'Evaluate risks to data subjects', 'Define mitigations'] },
  { process_type: 'data_protection', stage_id: 'data_breach_response', role_id: 'dpo', title_en: 'Data Breach Response Procedure', title_ar: 'إجراء الاستجابة لخرق البيانات', sla_hours: 72, steps: ['Assess breach severity', 'Notify authorities within 72h', 'Notify affected individuals', 'Document and close'] },
  { process_type: 'change_management', stage_id: 'change_request', role_id: 'change_manager', title_en: 'Change Request Procedure', title_ar: 'إجراء طلب التغيير', sla_hours: 72, steps: ['Submit change request', 'Assess impact and risk', 'Obtain approval', 'Schedule implementation'] },
  { process_type: 'change_management', stage_id: 'change_review', role_id: 'change_manager', title_en: 'Post-Implementation Change Review Procedure', title_ar: 'إجراء مراجعة ما بعد التنفيذ', sla_hours: 168, steps: ['Verify implementation success', 'Check for side effects', 'Update documentation', 'Close change request'] },
  { process_type: 'bcm_disaster_recovery', stage_id: 'bia', role_id: 'bcm_manager', title_en: 'Business Impact Analysis Procedure', title_ar: 'إجراء تحليل أثر الأعمال', sla_hours: 336, steps: ['Identify critical processes', 'Determine recovery objectives', 'Assess resource dependencies', 'Prioritize recovery sequence'] },
  { process_type: 'bcm_disaster_recovery', stage_id: 'bc_plan', role_id: 'bcm_manager', title_en: 'Business Continuity Plan Procedure', title_ar: 'إجراء خطة استمرارية الأعمال', sla_hours: 336, steps: ['Define recovery strategies', 'Assign recovery teams', 'Document activation procedures', 'Schedule testing exercises'] },
];

export async function seedProcedures(
  tenantId: string,
): Promise<{ seeded: number }> {
  const schema = tenantSchema(tenantId);
  let seeded = 0;

  for (const p of BASELINE_PROCEDURES) {
    const exists = await safeQuery(
      `SELECT 1 FROM "${schema}".sop_procedures
       WHERE process_type = $1 AND stage_id = $2 LIMIT 1`,
      [p.process_type, p.stage_id],
    );
    if (exists.rows.length > 0) continue;

    await safeQuery(
      `INSERT INTO "${schema}".sop_procedures
         (process_type, stage_id, role_id, title_en, title_ar, steps_en, steps_ar,
          prerequisites, expected_output, sla_hours, version, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, 'active')`,
      [
        p.process_type, p.stage_id, p.role_id,
        p.title_en, p.title_ar,
        JSON.stringify(p.steps.map((s, i) => ({ step: i + 1, description: s }))),
        JSON.stringify(p.steps.map((s, i) => ({ step: i + 1, description: s }))), // Arabic same for now
        'Active governance framework',
        `Completed ${p.title_en.toLowerCase()}`,
        p.sla_hours,
      ],
    );
    seeded++;
  }

  return { seeded };
}

// ── Governance Procedures (frontend procedures table) ───────────────────
// The frontend reads from "procedures" (renamed to "governance_procedures" in mig 032).
// safeQuery handles missing tables gracefully.

const GOVERNANCE_PROCEDURES = [
  { title: 'Risk Identification & Registration', category: 'risk_management', sop_type: 'operational', review_frequency: 'annual',
    content: 'This procedure defines the process for identifying, categorizing, and registering organizational risks in the enterprise risk register.',
    description: 'Covers risk identification sources, categorization criteria, initial rating methodology, and register entry requirements.' },
  { title: 'Risk Assessment & Rating', category: 'risk_management', sop_type: 'operational', review_frequency: 'annual',
    content: 'This procedure describes the methodology for assessing risks using likelihood and impact matrices to calculate risk scores.',
    description: 'Defines likelihood scales, impact dimensions, risk scoring formula, and risk tolerance thresholds.' },
  { title: 'Policy Review & Approval', category: 'compliance', sop_type: 'governance', review_frequency: 'annual',
    content: 'This procedure governs the periodic review, update, and approval workflow for all organizational policies.',
    description: 'Covers review triggers, stakeholder consultation, approval workflow, version control, and distribution.' },
  { title: 'Compliance Gap Analysis', category: 'compliance', sop_type: 'operational', review_frequency: 'semi_annual',
    content: 'This procedure defines how to map controls to regulatory requirements and identify compliance gaps.',
    description: 'Covers requirement mapping, gap identification, prioritization matrix, and remediation task creation.' },
  { title: 'Incident Triage & Classification', category: 'incident_response', sop_type: 'operational', review_frequency: 'semi_annual',
    content: 'This procedure describes the triage process for security incidents including classification, severity assignment, and escalation.',
    description: 'Defines severity levels, classification criteria, escalation thresholds, and initial response actions.' },
  { title: 'Incident Containment & Recovery', category: 'incident_response', sop_type: 'operational', review_frequency: 'annual',
    content: 'This procedure covers containment strategies, evidence preservation, system recovery, and post-incident verification.',
    description: 'Defines containment actions by incident type, evidence chain of custody, recovery procedures, and verification steps.' },
  { title: 'Audit Planning & Scoping', category: 'audit', sop_type: 'governance', review_frequency: 'annual',
    content: 'This procedure governs the annual audit planning process including scope definition, resource allocation, and timeline.',
    description: 'Covers risk-based audit selection, scope determination, audit program creation, and scheduling.' },
  { title: 'Evidence Collection & Validation', category: 'audit', sop_type: 'operational', review_frequency: 'annual',
    content: 'This procedure defines how audit evidence is requested, collected, validated, and archived for control effectiveness testing.',
    description: 'Covers evidence request process, completeness checks, validation criteria, and archival requirements.' },
  { title: 'Vendor Risk Assessment', category: 'vendor_management', sop_type: 'operational', review_frequency: 'annual',
    content: 'This procedure describes the vendor risk assessment process from questionnaire issuance through risk scoring and treatment.',
    description: 'Covers vendor classification, assessment questionnaire, risk scoring methodology, and ongoing monitoring.' },
  { title: 'Vendor Onboarding Due Diligence', category: 'vendor_management', sop_type: 'operational', review_frequency: 'annual',
    content: 'This procedure governs the due diligence process for onboarding new vendors including documentation review and approval.',
    description: 'Defines required documentation, security assessment, contract review, and approval workflow.' },
  { title: 'Data Protection Impact Assessment', category: 'data_protection', sop_type: 'governance', review_frequency: 'annual',
    content: 'This procedure defines how to conduct DPIAs for new processing activities involving personal data.',
    description: 'Covers DPIA triggers, assessment methodology, risk mitigation, and supervisory authority notification.' },
  { title: 'Change Request & Approval', category: 'change_management', sop_type: 'operational', review_frequency: 'annual',
    content: 'This procedure governs the change management process from request submission through impact assessment and approval.',
    description: 'Defines change categories, impact/risk assessment, CAB review process, and implementation scheduling.' },
  { title: 'Business Impact Analysis', category: 'bcm', sop_type: 'governance', review_frequency: 'annual',
    content: 'This procedure defines the BIA process for identifying critical processes and determining recovery objectives.',
    description: 'Covers process criticality assessment, RTO/RPO determination, resource dependencies, and priority ranking.' },
  { title: 'Business Continuity Plan Testing', category: 'bcm', sop_type: 'operational', review_frequency: 'annual',
    content: 'This procedure governs the testing and exercising of business continuity plans including tabletop and simulation exercises.',
    description: 'Defines test types, exercise planning, execution, results documentation, and plan update triggers.' },
  { title: 'Board Governance Reporting', category: 'governance', sop_type: 'governance', review_frequency: 'quarterly',
    content: 'This procedure defines the preparation, review, and delivery of governance reports to the board of directors.',
    description: 'Covers report content requirements, data sources, review workflow, and presentation format.' },
  { title: 'Exception Management & Approval', category: 'governance', sop_type: 'governance', review_frequency: 'annual',
    content: 'This procedure governs the process for requesting, reviewing, and approving control exceptions with compensating controls.',
    description: 'Defines exception request format, risk assessment, approval authority, compensating controls, and expiry tracking.' },
  { title: 'Regulatory Change Management', category: 'compliance', sop_type: 'governance', review_frequency: 'semi_annual',
    content: 'This procedure describes how regulatory changes are monitored, assessed for impact, and incorporated into the compliance program.',
    description: 'Covers regulatory monitoring sources, impact assessment methodology, control updates, and stakeholder notification.' },
  { title: 'Access Control Review', category: 'security', sop_type: 'operational', review_frequency: 'quarterly',
    content: 'This procedure governs the periodic review of user access rights including privileged account certification.',
    description: 'Defines review scope, certification workflow, remediation of inappropriate access, and documentation requirements.' },
  { title: 'Governance Health Assessment', category: 'governance', sop_type: 'governance', review_frequency: 'quarterly',
    content: 'This procedure defines the process for computing, reviewing, and acting on governance health scores across 8 dimensions.',
    description: 'Covers health dimension calculations, threshold management, board watchlist criteria, and improvement planning.' },
  { title: 'Delegation of Authority Management', category: 'governance', sop_type: 'governance', review_frequency: 'annual',
    content: 'This procedure governs the creation, review, renewal, and revocation of delegated authorities within the organization.',
    description: 'Defines delegation types, approval requirements, scope limitations, expiry management, and conflict checks.' },
];

export async function seedGovernanceProcedures(
  tenantId: string,
): Promise<{ seeded: number }> {
  const schema = tenantSchema(tenantId);
  const adminId = await getTenantAdmin(tenantId);
  let seeded = 0;

  // Try both table names (procedures or governance_procedures after rename)
  const tableName = await safeQuery(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name = 'procedures' LIMIT 1`,
  ).then(r => r.rows.length > 0 ? 'procedures' : 'governance_procedures');

  for (const p of GOVERNANCE_PROCEDURES) {
    const exists = await safeQuery(
      `SELECT 1 FROM "${schema}"."${tableName}" WHERE title = $1 AND deleted_at IS NULL LIMIT 1`,
      [p.title],
    );
    if (exists.rows.length > 0) continue;

    const policies = await safeQuery(
      `SELECT policy_id FROM "${schema}".policies WHERE deleted_at IS NULL LIMIT 1`,
    );
    const linkedPolicyId = getFirstRow(policies)?.policy_id || null;

    await safeQuery(
      `INSERT INTO "${schema}"."${tableName}"
         (title, content, description, category, owner, linked_policy_id,
          review_frequency, sop_type, tags, effective_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE)`,
      [
        p.title, p.content, p.description, p.category, adminId, linkedPolicyId,
        p.review_frequency, p.sop_type, [p.category],
      ],
    );
    seeded++;
  }

  return { seeded };
}

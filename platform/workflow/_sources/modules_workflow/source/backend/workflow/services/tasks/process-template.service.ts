/**
 * Process Template Service — AI-Guided GRC Partner
 *
 * Provides predefined GRC process templates that can be instantiated
 * as workflow instances for tenants.
 *
 * Requirements: 4.3, 7.2, 8.2, 9.4
 */

import { safeQuery } from "@dos/db";

// ===========================================================================
// Types — local richer shape of the GRC process template. The `@dos/types`
// `ProcessTemplate` is an open record; this module's templates have a
// concrete stages/fields layout, so we declare it here rather than widen
// the cross-package contract.
// ===========================================================================

export interface ProcessStage {
  stageId: string;
  name: string;
  order: number;
  actions: string[];
  /** Optional — some stages are zero-SLA (e.g. instant events). */
  slaHours?: number;
}

export interface ProcessTemplate {
  templateId: string;
  processType: string;
  nameEn: string;
  nameAr: string;
  stages: ProcessStage[];
  /** Optional — some templates declare required roles. */
  requiredRoles?: string[];
  /** Optional — frameworks the template is calibrated against. */
  applicableFrameworks?: string[];
  /** Allow additional template metadata without widening the contract churn. */
  [key: string]: unknown;
}

// ===========================================================================
// Predefined Templates
// ===========================================================================

const TEMPLATES: ProcessTemplate[] = [
  {
    templateId: 'policy-lifecycle',
    processType: 'policy-lifecycle',
    nameEn: 'Policy Lifecycle Management',
    nameAr: 'إدارة دورة حياة السياسات',
    stages: [
      { stageId: 'draft', name: 'Draft', order: 1, actions: ['create_draft', 'assign_owner'], slaHours: 72 },
      { stageId: 'review', name: 'Review', order: 2, actions: ['submit_review', 'collect_feedback'], slaHours: 48 },
      { stageId: 'approve', name: 'Approval', order: 3, actions: ['route_approval', 'sign_off'], slaHours: 24 },
      { stageId: 'publish', name: 'Publish', order: 4, actions: ['publish_policy', 'notify_stakeholders'], slaHours: 8 },
      { stageId: 'monitor', name: 'Monitor & Review', order: 5, actions: ['schedule_review', 'track_compliance'] },
    ],
    requiredRoles: ['policy_owner', 'compliance_manager', 'ciso'],
    applicableFrameworks: ['*'],
  },
  {
    templateId: 'risk-assessment',
    processType: 'risk-assessment',
    nameEn: 'Risk Assessment Process',
    nameAr: 'عملية تقييم المخاطر',
    stages: [
      { stageId: 'identify', name: 'Identify Risks', order: 1, actions: ['create_risk_register', 'categorize_risks'], slaHours: 48 },
      { stageId: 'analyze', name: 'Analyze', order: 2, actions: ['assess_likelihood', 'assess_impact', 'compute_score'], slaHours: 72 },
      { stageId: 'evaluate', name: 'Evaluate', order: 3, actions: ['prioritize_risks', 'compare_appetite'], slaHours: 24 },
      { stageId: 'treat', name: 'Treat', order: 4, actions: ['define_treatment', 'assign_controls'], slaHours: 96 },
      { stageId: 'monitor', name: 'Monitor', order: 5, actions: ['track_residual_risk', 'schedule_reassessment'] },
    ],
    requiredRoles: ['risk_manager', 'ciso', 'control_owner'],
    applicableFrameworks: ['*'],
  },
  {
    templateId: 'incident-response',
    processType: 'incident-response',
    nameEn: 'Incident Response Process',
    nameAr: 'عملية الاستجابة للحوادث',
    stages: [
      { stageId: 'detect', name: 'Detection', order: 1, actions: ['report_incident', 'classify_severity'], slaHours: 1 },
      { stageId: 'contain', name: 'Containment', order: 2, actions: ['isolate_systems', 'preserve_evidence'], slaHours: 4 },
      { stageId: 'eradicate', name: 'Eradication', order: 3, actions: ['remove_threat', 'patch_vulnerability'], slaHours: 24 },
      { stageId: 'recover', name: 'Recovery', order: 4, actions: ['restore_systems', 'verify_integrity'], slaHours: 48 },
      { stageId: 'lessons', name: 'Lessons Learned', order: 5, actions: ['document_findings', 'update_playbook'], slaHours: 72 },
    ],
    requiredRoles: ['it_security_officer', 'ciso', 'incident_responder'],
    applicableFrameworks: ['*'],
  },
  {
    templateId: 'vendor-assessment',
    processType: 'vendor-assessment',
    nameEn: 'Vendor Risk Assessment',
    nameAr: 'تقييم مخاطر الموردين',
    stages: [
      { stageId: 'classify', name: 'Classify Vendor', order: 1, actions: ['determine_tier', 'assess_data_access'], slaHours: 24 },
      { stageId: 'questionnaire', name: 'Questionnaire', order: 2, actions: ['send_questionnaire', 'collect_responses'], slaHours: 168 },
      { stageId: 'evaluate', name: 'Evaluate', order: 3, actions: ['score_responses', 'identify_gaps'], slaHours: 48 },
      { stageId: 'remediate', name: 'Remediate', order: 4, actions: ['request_remediation', 'verify_fixes'], slaHours: 336 },
      { stageId: 'approve', name: 'Approve', order: 5, actions: ['approve_vendor', 'set_monitoring'], slaHours: 24 },
    ],
    requiredRoles: ['vendor_manager', 'risk_manager', 'ciso'],
    applicableFrameworks: ['*'],
  },
  {
    templateId: 'audit',
    processType: 'audit',
    nameEn: 'Internal Audit Process',
    nameAr: 'عملية التدقيق الداخلي',
    stages: [
      { stageId: 'plan', name: 'Plan', order: 1, actions: ['define_scope', 'assign_auditors'], slaHours: 48 },
      { stageId: 'execute', name: 'Execute', order: 2, actions: ['collect_evidence', 'interview_stakeholders'], slaHours: 168 },
      { stageId: 'report', name: 'Report', order: 3, actions: ['document_findings', 'draft_report'], slaHours: 72 },
      { stageId: 'remediate', name: 'Remediate', order: 4, actions: ['assign_actions', 'track_closure'], slaHours: 336 },
      { stageId: 'close', name: 'Close', order: 5, actions: ['verify_remediation', 'close_audit'], slaHours: 24 },
    ],
    requiredRoles: ['internal_auditor', 'compliance_manager', 'ciso'],
    applicableFrameworks: ['*'],
  },
  {
    templateId: 'bcp',
    processType: 'bcp',
    nameEn: 'Business Continuity Planning',
    nameAr: 'تخطيط استمرارية الأعمال',
    stages: [
      { stageId: 'bia', name: 'Business Impact Analysis', order: 1, actions: ['identify_processes', 'assess_impact', 'define_rto_rpo'], slaHours: 96 },
      { stageId: 'strategy', name: 'Strategy', order: 2, actions: ['define_recovery_strategy', 'allocate_resources'], slaHours: 72 },
      { stageId: 'plan', name: 'Plan Development', order: 3, actions: ['draft_bcp', 'assign_responsibilities'], slaHours: 96 },
      { stageId: 'test', name: 'Testing', order: 4, actions: ['schedule_drill', 'execute_test', 'document_results'], slaHours: 168 },
      { stageId: 'maintain', name: 'Maintain', order: 5, actions: ['review_plan', 'update_contacts', 'schedule_next_test'] },
    ],
    requiredRoles: ['bcp_coordinator', 'ciso', 'operations_manager'],
    applicableFrameworks: ['*'],
  },
];

// ===========================================================================
// Pure Functions
// ===========================================================================

/**
 * Get a process template by its type.
 * Returns null if no template matches.
 */
export function getTemplateByType(processType: string): ProcessTemplate | null {
  return TEMPLATES.find(t => t.processType === processType) ?? null;
}

/**
 * Get all available process templates.
 */
export function getAvailableTemplates(): ProcessTemplate[] {
  return [...TEMPLATES];
}

/**
 * Instantiate a process from a template, creating a workflow-ready structure.
 * Adjusts SLA hours based on team size (larger teams get shorter SLAs).
 */
export function instantiateProcess(
  template: ProcessTemplate,
  teamSize: number,
): {
  templateId: string;
  stages: Array<Omit<ProcessTemplate['stages'][number], 'slaHours'> & { slaHours?: number }>;
  adjustedSlaHours: Record<string, number>;
} {
  const slaMultiplier = teamSize >= 10 ? 0.7 : teamSize >= 5 ? 0.85 : 1.0;
  const adjustedSlaHours: Record<string, number> = {};

  const stages = template.stages.map(stage => {
    const adjusted = stage.slaHours
      ? Math.max(1, Math.round(stage.slaHours * slaMultiplier))
      : undefined;
    if (adjusted !== undefined) {
      adjustedSlaHours[stage.stageId] = adjusted;
    }
    return { ...stage, slaHours: adjusted };
  });

  return { templateId: template.templateId, stages, adjustedSlaHours };
}

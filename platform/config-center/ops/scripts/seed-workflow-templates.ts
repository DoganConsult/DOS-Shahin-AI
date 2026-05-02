/**
 * Seed Workflow Templates
 *
 * Seeds the canonical GRC workflow templates into dos.workflow_templates.
 * Adapted from monolith backend/src/data/seed-workflow-templates.ts.
 *
 * Usage:  npx tsx ops/scripts/seed-workflow-templates.ts
 */

import { randomUUID } from 'crypto';
import { safeQuery, getPool } from '@dos/db';
import { logger } from '@dos/platform-core/observability';

// ---------------------------------------------------------------------------
// Template shape
// ---------------------------------------------------------------------------

interface WorkflowTemplateSeed {
  templateCode: string;
  name: string;
  description: string;
  category: string;
  definition: {
    nodes: Array<{ id: string; type: string; subType: string; config: Record<string, unknown>; position: { x: number; y: number } }>;
    edges: Array<{ id: string; source: string; target: string; label?: string }>;
    swimlanes: string[];
    triggers: unknown[];
  };
  parametersSchema: Record<string, { type: string; description: string; required: boolean; default?: any }>;
}

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

const riskAssessment: WorkflowTemplateSeed = {
  templateCode: 'risk_assessment',
  name: 'Risk Assessment',
  category: 'risk',
  description: 'End-to-end risk assessment workflow: from new risk identification through scoring, approval, and remediation creation.',
  definition: {
    nodes: [
      { id: 'ra-trigger', type: 'trigger', subType: 'new_risk', config: { event: 'risk.created' }, position: { x: 0, y: 100 } },
      { id: 'ra-assign', type: 'action', subType: 'assign_assessor', config: { assignee: '{{assessorId}}', message: 'New risk requires assessment' }, position: { x: 200, y: 100 } },
      { id: 'ra-assess', type: 'action', subType: 'assess_risk', config: { methodology: '{{methodology}}', deadline_days: '{{deadlineDays}}' }, position: { x: 400, y: 100 } },
      { id: 'ra-check', type: 'condition', subType: 'score_threshold', config: { field: 'risk_score', operator: '>=', value: 12 }, position: { x: 600, y: 100 } },
      { id: 'ra-approve', type: 'governance', subType: 'approval', config: { approver: '{{approverId}}', sla_hours: '{{slaHours}}' }, position: { x: 800, y: 100 } },
      { id: 'ra-remediate', type: 'action', subType: 'create_remediation', config: { priority: '{{remediationPriority}}', template: 'risk_remediation' }, position: { x: 1000, y: 100 } },
      { id: 'ra-end', type: 'end', subType: 'complete', config: { status: 'completed' }, position: { x: 1200, y: 100 } },
    ],
    edges: [
      { id: 'ra-e1', source: 'ra-trigger', target: 'ra-assign' },
      { id: 'ra-e2', source: 'ra-assign', target: 'ra-assess' },
      { id: 'ra-e3', source: 'ra-assess', target: 'ra-check' },
      { id: 'ra-e4', source: 'ra-check', target: 'ra-approve', label: 'score >= 12' },
      { id: 'ra-e5', source: 'ra-check', target: 'ra-end', label: 'score < 12' },
      { id: 'ra-e6', source: 'ra-approve', target: 'ra-remediate' },
      { id: 'ra-e7', source: 'ra-remediate', target: 'ra-end' },
    ],
    swimlanes: ['Risk Team', 'Governance'],
    triggers: [{ type: 'event', event: 'risk.created' }],
  },
  parametersSchema: {
    assessorId: { type: 'string', description: 'User ID of the risk assessor', required: true },
    methodology: { type: 'string', description: 'Assessment methodology (qualitative, quantitative, hybrid)', required: false, default: 'qualitative' },
    deadlineDays: { type: 'number', description: 'Days allowed for assessment completion', required: false, default: 14 },
    approverId: { type: 'string', description: 'User ID of the approver for high-risk items', required: true },
    slaHours: { type: 'number', description: 'SLA hours for approval decision', required: false, default: 48 },
    remediationPriority: { type: 'string', description: 'Default priority for remediation tasks', required: false, default: 'high' },
  },
};

const complianceAudit: WorkflowTemplateSeed = {
  templateCode: 'compliance_audit',
  name: 'Compliance Audit',
  category: 'compliance',
  description: 'Scheduled compliance audit workflow: framework selection, evidence gathering, control assessment, findings review, and report generation.',
  definition: {
    nodes: [
      { id: 'ca-trigger', type: 'trigger', subType: 'scheduled', config: { schedule: '{{auditSchedule}}' }, position: { x: 0, y: 100 } },
      { id: 'ca-framework', type: 'action', subType: 'select_framework', config: { framework_id: '{{frameworkId}}' }, position: { x: 200, y: 100 } },
      { id: 'ca-evidence', type: 'action', subType: 'gather_evidence', config: { deadline_days: '{{evidenceDeadlineDays}}', notify_owners: true }, position: { x: 400, y: 100 } },
      { id: 'ca-assess', type: 'action', subType: 'assess_controls', config: { methodology: '{{auditMethodology}}' }, position: { x: 600, y: 100 } },
      { id: 'ca-review', type: 'governance', subType: 'review_findings', config: { reviewer: '{{reviewerId}}', sla_hours: '{{reviewSlaHours}}' }, position: { x: 800, y: 100 } },
      { id: 'ca-report', type: 'action', subType: 'generate_report', config: { report_type: '{{reportType}}', include_evidence: true }, position: { x: 1000, y: 100 } },
      { id: 'ca-end', type: 'end', subType: 'complete', config: { status: 'completed' }, position: { x: 1200, y: 100 } },
    ],
    edges: [
      { id: 'ca-e1', source: 'ca-trigger', target: 'ca-framework' },
      { id: 'ca-e2', source: 'ca-framework', target: 'ca-evidence' },
      { id: 'ca-e3', source: 'ca-evidence', target: 'ca-assess' },
      { id: 'ca-e4', source: 'ca-assess', target: 'ca-review' },
      { id: 'ca-e5', source: 'ca-review', target: 'ca-report' },
      { id: 'ca-e6', source: 'ca-report', target: 'ca-end' },
    ],
    swimlanes: ['Audit Team', 'Governance'],
    triggers: [{ type: 'schedule', cron: '{{auditSchedule}}' }],
  },
  parametersSchema: {
    auditSchedule: { type: 'string', description: 'Cron expression for audit schedule', required: false, default: '0 0 1 */3 *' },
    frameworkId: { type: 'string', description: 'Target framework ID', required: true },
    evidenceDeadlineDays: { type: 'number', description: 'Days for evidence collection', required: false, default: 21 },
    auditMethodology: { type: 'string', description: 'Audit methodology', required: false, default: 'combined' },
    reviewerId: { type: 'string', description: 'Findings reviewer user ID', required: true },
    reviewSlaHours: { type: 'number', description: 'SLA hours for review', required: false, default: 72 },
    reportType: { type: 'string', description: 'Report format', required: false, default: 'detailed' },
  },
};

const incidentResponse: WorkflowTemplateSeed = {
  templateCode: 'incident_response',
  name: 'Incident Response',
  category: 'incident',
  description: 'Incident response workflow: triage by severity, team notification, investigation, containment, and post-mortem review.',
  definition: {
    nodes: [
      { id: 'ir-trigger', type: 'trigger', subType: 'incident_reported', config: { event: 'incident.created' }, position: { x: 0, y: 100 } },
      { id: 'ir-check', type: 'condition', subType: 'severity_check', config: { field: 'severity', operator: '>=', value: '{{severityThreshold}}' }, position: { x: 200, y: 100 } },
      { id: 'ir-notify', type: 'action', subType: 'notify_team', config: { channel: '{{notificationChannel}}', team: '{{responseTeam}}' }, position: { x: 400, y: 100 } },
      { id: 'ir-investigate', type: 'action', subType: 'investigate', config: { deadline_hours: '{{investigationHours}}', assign_to: '{{investigatorId}}' }, position: { x: 600, y: 100 } },
      { id: 'ir-contain', type: 'action', subType: 'contain', config: { containment_type: '{{containmentType}}' }, position: { x: 800, y: 100 } },
      { id: 'ir-postmortem', type: 'governance', subType: 'post_mortem_review', config: { reviewer: '{{postMortemReviewer}}', sla_hours: '{{postMortemSlaHours}}' }, position: { x: 1000, y: 100 } },
      { id: 'ir-end', type: 'end', subType: 'complete', config: { status: 'resolved' }, position: { x: 1200, y: 100 } },
    ],
    edges: [
      { id: 'ir-e1', source: 'ir-trigger', target: 'ir-check' },
      { id: 'ir-e2', source: 'ir-check', target: 'ir-notify', label: 'severity >= high' },
      { id: 'ir-e3', source: 'ir-check', target: 'ir-end', label: 'severity < high' },
      { id: 'ir-e4', source: 'ir-notify', target: 'ir-investigate' },
      { id: 'ir-e5', source: 'ir-investigate', target: 'ir-contain' },
      { id: 'ir-e6', source: 'ir-contain', target: 'ir-postmortem' },
      { id: 'ir-e7', source: 'ir-postmortem', target: 'ir-end' },
    ],
    swimlanes: ['Incident Team', 'Governance'],
    triggers: [{ type: 'event', event: 'incident.created' }],
  },
  parametersSchema: {
    severityThreshold: { type: 'string', description: 'Minimum severity to trigger full response', required: false, default: 'high' },
    notificationChannel: { type: 'string', description: 'Notification channel', required: false, default: 'email' },
    responseTeam: { type: 'string', description: 'Team identifier', required: true },
    investigationHours: { type: 'number', description: 'Hours for investigation', required: false, default: 24 },
    investigatorId: { type: 'string', description: 'Lead investigator', required: true },
    containmentType: { type: 'string', description: 'Containment strategy', required: false, default: 'mitigate' },
    postMortemReviewer: { type: 'string', description: 'Post-mortem reviewer', required: true },
    postMortemSlaHours: { type: 'number', description: 'SLA for post-mortem', required: false, default: 120 },
  },
};

const evidenceCollection: WorkflowTemplateSeed = {
  templateCode: 'evidence_collection',
  name: 'Evidence Collection',
  category: 'evidence',
  description: 'Automated evidence collection workflow: triggered by control due dates, assigns collectors, validates evidence, and attaches to controls.',
  definition: {
    nodes: [
      { id: 'ec-trigger', type: 'trigger', subType: 'control_due', config: { event: 'control.evidence_due', days_before: '{{daysBefore}}' }, position: { x: 0, y: 100 } },
      { id: 'ec-assign', type: 'action', subType: 'assign_collector', config: { assignee: '{{collectorId}}' }, position: { x: 200, y: 100 } },
      { id: 'ec-collect', type: 'action', subType: 'collect_evidence', config: { evidence_types: '{{evidenceTypes}}', deadline_days: '{{collectionDeadlineDays}}' }, position: { x: 400, y: 100 } },
      { id: 'ec-validate', type: 'condition', subType: 'evidence_valid', config: { field: 'evidence_status', operator: '==', value: 'valid' }, position: { x: 600, y: 100 } },
      { id: 'ec-attach', type: 'action', subType: 'attach_to_control', config: { auto_verify: '{{autoVerify}}' }, position: { x: 800, y: 100 } },
      { id: 'ec-end', type: 'end', subType: 'complete', config: { status: 'completed' }, position: { x: 1000, y: 100 } },
    ],
    edges: [
      { id: 'ec-e1', source: 'ec-trigger', target: 'ec-assign' },
      { id: 'ec-e2', source: 'ec-assign', target: 'ec-collect' },
      { id: 'ec-e3', source: 'ec-collect', target: 'ec-validate' },
      { id: 'ec-e4', source: 'ec-validate', target: 'ec-attach', label: 'valid' },
      { id: 'ec-e5', source: 'ec-validate', target: 'ec-collect', label: 'invalid' },
      { id: 'ec-e6', source: 'ec-attach', target: 'ec-end' },
    ],
    swimlanes: ['Evidence Team'],
    triggers: [{ type: 'event', event: 'control.evidence_due' }],
  },
  parametersSchema: {
    daysBefore: { type: 'number', description: 'Days before due to trigger', required: false, default: 7 },
    collectorId: { type: 'string', description: 'Evidence collector', required: true },
    evidenceTypes: { type: 'string', description: 'Evidence types to collect', required: false, default: 'document,screenshot' },
    collectionDeadlineDays: { type: 'number', description: 'Days for collection', required: false, default: 10 },
    autoVerify: { type: 'boolean', description: 'Auto-verify hash', required: false, default: true },
  },
};

const policyReview: WorkflowTemplateSeed = {
  templateCode: 'policy_review',
  name: 'Policy Review & Approval',
  category: 'policy',
  description: 'Policy lifecycle workflow: triggered by review due dates, assigns reviewers, routes through committee approval, and publishes approved policies.',
  definition: {
    nodes: [
      { id: 'pr-trigger', type: 'trigger', subType: 'policy_due', config: { event: 'policy.review_due' }, position: { x: 0, y: 100 } },
      { id: 'pr-assign', type: 'action', subType: 'assign_reviewer', config: { assignee: '{{reviewerId}}' }, position: { x: 200, y: 100 } },
      { id: 'pr-review', type: 'action', subType: 'review_policy', config: { review_checklist: '{{reviewChecklist}}', deadline_days: '{{reviewDeadlineDays}}' }, position: { x: 400, y: 100 } },
      { id: 'pr-committee', type: 'governance', subType: 'committee_approval', config: { committee: '{{committeeId}}', quorum: '{{quorum}}', sla_hours: '{{approvalSlaHours}}' }, position: { x: 600, y: 100 } },
      { id: 'pr-check', type: 'condition', subType: 'approval_check', config: { field: 'approval_status', operator: '==', value: 'approved' }, position: { x: 800, y: 100 } },
      { id: 'pr-publish', type: 'action', subType: 'publish_policy', config: { notify_stakeholders: '{{notifyStakeholders}}', version_bump: true }, position: { x: 1000, y: 100 } },
      { id: 'pr-end', type: 'end', subType: 'complete', config: { status: 'completed' }, position: { x: 1200, y: 100 } },
    ],
    edges: [
      { id: 'pr-e1', source: 'pr-trigger', target: 'pr-assign' },
      { id: 'pr-e2', source: 'pr-assign', target: 'pr-review' },
      { id: 'pr-e3', source: 'pr-review', target: 'pr-committee' },
      { id: 'pr-e4', source: 'pr-committee', target: 'pr-check' },
      { id: 'pr-e5', source: 'pr-check', target: 'pr-publish', label: 'approved' },
      { id: 'pr-e6', source: 'pr-check', target: 'pr-review', label: 'rejected' },
      { id: 'pr-e7', source: 'pr-publish', target: 'pr-end' },
    ],
    swimlanes: ['Policy Team', 'Governance Committee'],
    triggers: [{ type: 'event', event: 'policy.review_due' }],
  },
  parametersSchema: {
    reviewerId: { type: 'string', description: 'Policy reviewer', required: true },
    reviewChecklist: { type: 'string', description: 'Review checklist', required: false, default: 'standard' },
    reviewDeadlineDays: { type: 'number', description: 'Days for review', required: false, default: 14 },
    committeeId: { type: 'string', description: 'Committee for approval', required: true },
    quorum: { type: 'number', description: 'Minimum approvals', required: false, default: 3 },
    approvalSlaHours: { type: 'number', description: 'SLA for approval', required: false, default: 168 },
    notifyStakeholders: { type: 'boolean', description: 'Notify on publish', required: false, default: true },
  },
};

const vendorDueDiligence: WorkflowTemplateSeed = {
  templateCode: 'vendor_due_diligence',
  name: 'Vendor Due Diligence',
  category: 'vendor',
  description: 'Vendor onboarding workflow: risk questionnaire, assessment, evaluation, approval gate, and onboarding.',
  definition: {
    nodes: [
      { id: 'vd-trigger', type: 'trigger', subType: 'new_vendor', config: { event: 'vendor.created' }, position: { x: 0, y: 100 } },
      { id: 'vd-questionnaire', type: 'action', subType: 'risk_questionnaire', config: { template: '{{questionnaireTemplate}}', deadline_days: '{{questionnaireDays}}' }, position: { x: 200, y: 100 } },
      { id: 'vd-assess', type: 'action', subType: 'assess_vendor', config: { criteria: '{{assessmentCriteria}}', assessor: '{{assessorId}}' }, position: { x: 400, y: 100 } },
      { id: 'vd-check', type: 'condition', subType: 'risk_acceptable', config: { field: 'vendor_risk_score', operator: '<=', value: '{{riskThreshold}}' }, position: { x: 600, y: 100 } },
      { id: 'vd-approve', type: 'governance', subType: 'approval', config: { approver: '{{approverId}}', sla_hours: '{{approvalSlaHours}}' }, position: { x: 800, y: 100 } },
      { id: 'vd-onboard', type: 'action', subType: 'onboard_vendor', config: { tier: '{{defaultTier}}', notify_procurement: '{{notifyProcurement}}' }, position: { x: 1000, y: 100 } },
      { id: 'vd-end', type: 'end', subType: 'complete', config: { status: 'completed' }, position: { x: 1200, y: 100 } },
    ],
    edges: [
      { id: 'vd-e1', source: 'vd-trigger', target: 'vd-questionnaire' },
      { id: 'vd-e2', source: 'vd-questionnaire', target: 'vd-assess' },
      { id: 'vd-e3', source: 'vd-assess', target: 'vd-check' },
      { id: 'vd-e4', source: 'vd-check', target: 'vd-approve', label: 'risk acceptable' },
      { id: 'vd-e5', source: 'vd-check', target: 'vd-end', label: 'risk too high' },
      { id: 'vd-e6', source: 'vd-approve', target: 'vd-onboard' },
      { id: 'vd-e7', source: 'vd-onboard', target: 'vd-end' },
    ],
    swimlanes: ['Vendor Management', 'Governance'],
    triggers: [{ type: 'event', event: 'vendor.created' }],
  },
  parametersSchema: {
    questionnaireTemplate: { type: 'string', description: 'Risk questionnaire', required: false, default: 'standard_vendor' },
    questionnaireDays: { type: 'number', description: 'Days for questionnaire', required: false, default: 14 },
    assessmentCriteria: { type: 'string', description: 'Assessment criteria', required: false, default: 'enhanced' },
    assessorId: { type: 'string', description: 'Vendor assessor', required: true },
    riskThreshold: { type: 'number', description: 'Max acceptable risk score', required: false, default: 60 },
    approverId: { type: 'string', description: 'Approval authority', required: true },
    approvalSlaHours: { type: 'number', description: 'SLA for approval', required: false, default: 72 },
    defaultTier: { type: 'string', description: 'Default vendor tier', required: false, default: 'medium' },
    notifyProcurement: { type: 'boolean', description: 'Notify procurement', required: false, default: true },
  },
};

const teamMemberOnboarding: WorkflowTemplateSeed = {
  templateCode: 'team_member_onboarding',
  name: 'Team Member Onboarding',
  category: 'operations',
  description: 'End-to-end GRC team member onboarding: invitation, acceptance, access provisioning, RACI briefing, compliance training, verification, and activation.',
  definition: {
    nodes: [
      { id: 'ob-trigger', type: 'trigger', subType: 'member_added', config: { event: 'team.member_added' }, position: { x: 0, y: 100 } },
      { id: 'ob-invite', type: 'action', subType: 'send_invitation', config: { email: '{{memberEmail}}', role: '{{memberRole}}' }, position: { x: 200, y: 100 } },
      { id: 'ob-accept', type: 'action', subType: 'await_acceptance', config: { deadline_days: '{{acceptDeadlineDays}}' }, position: { x: 400, y: 100 } },
      { id: 'ob-provision', type: 'action', subType: 'provision_access', config: { assignee: '{{hrAdminId}}', permissions: '{{defaultPermissions}}' }, position: { x: 600, y: 100 } },
      { id: 'ob-role', type: 'action', subType: 'assign_role_profile', config: { role_code: '{{roleCode}}', team_id: '{{teamId}}' }, position: { x: 800, y: 100 } },
      { id: 'ob-raci', type: 'action', subType: 'raci_briefing', config: { assignee: '{{teamLeadId}}', deadline_days: '{{raciBriefingDays}}' }, position: { x: 1000, y: 100 } },
      { id: 'ob-training', type: 'action', subType: 'compliance_training', config: { modules: '{{trainingModules}}', deadline_days: '{{trainingDeadlineDays}}' }, position: { x: 1200, y: 100 } },
      { id: 'ob-verify', type: 'governance', subType: 'onboarding_verification', config: { approver: '{{complianceOfficerId}}', sla_hours: '{{verifySlaHours}}' }, position: { x: 1400, y: 100 } },
      { id: 'ob-activate', type: 'action', subType: 'activate_member', config: { activation_mode: '{{activationMode}}' }, position: { x: 1600, y: 100 } },
      { id: 'ob-notify', type: 'action', subType: 'notify_team', config: { channel: 'email', message: 'New team member onboarded and activated' }, position: { x: 1800, y: 100 } },
      { id: 'ob-end', type: 'end', subType: 'complete', config: { status: 'completed' }, position: { x: 2000, y: 100 } },
    ],
    edges: [
      { id: 'ob-e1', source: 'ob-trigger', target: 'ob-invite' },
      { id: 'ob-e2', source: 'ob-invite', target: 'ob-accept' },
      { id: 'ob-e3', source: 'ob-accept', target: 'ob-provision' },
      { id: 'ob-e4', source: 'ob-provision', target: 'ob-role' },
      { id: 'ob-e5', source: 'ob-role', target: 'ob-raci' },
      { id: 'ob-e6', source: 'ob-raci', target: 'ob-training' },
      { id: 'ob-e7', source: 'ob-training', target: 'ob-verify' },
      { id: 'ob-e8', source: 'ob-verify', target: 'ob-activate', label: 'approved' },
      { id: 'ob-e9', source: 'ob-verify', target: 'ob-training', label: 'rejected' },
      { id: 'ob-e10', source: 'ob-activate', target: 'ob-notify' },
      { id: 'ob-e11', source: 'ob-notify', target: 'ob-end' },
    ],
    swimlanes: ['HR Admin', 'Team Lead', 'New Member', 'Compliance'],
    triggers: [{ type: 'event', event: 'team.member_added' }],
  },
  parametersSchema: {
    memberEmail: { type: 'string', description: 'New member email', required: true },
    memberRole: { type: 'string', description: 'Role to assign', required: true },
    acceptDeadlineDays: { type: 'number', description: 'Days for acceptance', required: false, default: 7 },
    hrAdminId: { type: 'string', description: 'HR admin for provisioning', required: true },
    defaultPermissions: { type: 'string', description: 'Default permissions', required: false, default: 'workspace:read,policy:read' },
    roleCode: { type: 'string', description: 'GRC role code', required: true },
    teamId: { type: 'string', description: 'Team ID', required: true },
    teamLeadId: { type: 'string', description: 'Team lead', required: true },
    raciBriefingDays: { type: 'number', description: 'Days for RACI briefing', required: false, default: 3 },
    trainingModules: { type: 'string', description: 'Training modules', required: false, default: 'security,compliance' },
    trainingDeadlineDays: { type: 'number', description: 'Days for training', required: false, default: 10 },
    complianceOfficerId: { type: 'string', description: 'Compliance officer', required: true },
    verifySlaHours: { type: 'number', description: 'SLA for verification', required: false, default: 48 },
    activationMode: { type: 'string', description: 'Activation mode', required: false, default: 'human_only' },
  },
};

// ---------------------------------------------------------------------------
// Seed array
// ---------------------------------------------------------------------------

const WORKFLOW_TEMPLATE_SEEDS: WorkflowTemplateSeed[] = [
  riskAssessment,
  complianceAudit,
  incidentResponse,
  evidenceCollection,
  policyReview,
  vendorDueDiligence,
  teamMemberOnboarding,
];

// ---------------------------------------------------------------------------
// Seed runner
// ---------------------------------------------------------------------------

async function seedWorkflowTemplates() {
  logger.info('[seed] Starting workflow template seed...');

  let seeded = 0;
  let skipped = 0;

  for (const template of WORKFLOW_TEMPLATE_SEEDS) {
    const templateId = randomUUID();

    try {
      const existing = await safeQuery(
        `SELECT template_id FROM dos.workflow_templates WHERE template_code = $1`,
        [template.templateCode],
      );

      if (existing.rows.length > 0) {
        logger.info(`[seed] Template ${template.templateCode} already exists -- skipping`);
        skipped++;
        continue;
      }

      await safeQuery(
        `INSERT INTO dos.workflow_templates
           (template_id, template_code, name, description, category, definition, parameters_schema, is_active, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, 1, NOW(), NOW())`,
        [
          templateId,
          template.templateCode,
          template.name,
          template.description,
          template.category,
          JSON.stringify(template.definition),
          JSON.stringify(template.parametersSchema),
        ],
      );

      logger.info(`[seed] Template seeded: ${template.templateCode} (${templateId})`);
      seeded++;
    } catch (err: any) {
      logger.error(`[seed] Failed to seed template ${template.templateCode}`, { error: err?.message });
    }
  }

  logger.info(`[seed] Done. ${seeded} seeded, ${skipped} skipped, ${WORKFLOW_TEMPLATE_SEEDS.length} total templates processed.`);

  // Graceful pool shutdown
  try {
    const pool = getPool();
    await pool.end();
  } catch {
    // Pool may not need explicit shutdown depending on @dos/db implementation
  }
}

seedWorkflowTemplates().catch((err) => {
  console.error('[seed] Failed to seed workflow templates:', err);
  process.exit(1);
});

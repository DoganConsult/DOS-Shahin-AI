import type { ModuleManifest } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { TRAINING_PERMISSIONS, TRAINING_ROLES, TRAINING_ACTIONS } from './security/training.security';
import { TRAINING_APPROVAL_MATRIX } from './security/training.approval-matrix';

export const TRAINING_MANIFEST: ModuleManifest = {
  code: 'training',
  version: '2.0.0',
  aliases: [],
  nameEn: 'Training & Awareness',
  nameAr: 'التدريب والتوعية',
  descriptionEn: 'Compliance training campaigns, course management, quiz tracking, and certification.',
  descriptionAr: 'حملات التدريب على الامتثال وإدارة الدورات وتتبع الاختبارات والشهادات.',
  tier: 'domain',
  category: 'operational',
  routeBase: '/api/training',
  eventNamespace: 'training',
  tablePrefix: 'training_',
  ownedTables: [
    'training_campaigns', 'training_assignments', 'training_completions',
    'training_content', 'training_courses', 'training_certificates',
    'training_quiz_results', 'training_reminders', 'training_requirements',
    'training_schedules', 'training_topics', 'training_audit_log',
  ],
  sharedTables: [],
  referencedTables: ['audit_trail', 'teams', 'workflows'],
  aggregateRoots: ['training_campaigns', 'training_courses', 'training_assignments', 'training_certificates'],
  publishedEvents: [
    'training.campaign_launched', 'training.campaign_completed',
    'training.assignment_created', 'training.assignment_completed',
    'training.assignment_overdue', 'training.certificate_issued',
    'training.quiz_passed', 'training.quiz_failed',
    'training.reminder_sent', 'training.content_published',
  ],
  consumedEvents: [
    'compliance.posture_changed', 'policy.approved',
    'incident.lesson_documented', 'workflow.status_changed',
  ],
  hardDeps: [],
  softDeps: ['compliance', 'policy', 'incident'],
  navId: 'training',
  navChildCount: 8,
  workflowTemplateCode: 'training_campaign',
  workflowSlaHours: 336,
  automationLevel: 'semi',
  agentBinding: 'A-TRN',
  aiCapabilities: ['notes', 'recommendations', 'gate_checks'],
  aiEnabled: true,
  featureFlags: ['training.ai_content', 'training.gamification'],
  installable: true,
  provisioningOrder: 23,
  licensingTier: 'professional',
  visibility: 'both',
  adminSurfaces: ['training-catalog', 'campaign-config', 'certificate-templates', 'requirement-rules'],

  securityPermissions: TRAINING_PERMISSIONS,
  securityRoles: TRAINING_ROLES,
  securityActions: TRAINING_ACTIONS,
  approvalRules: TRAINING_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'training_campaign', ownerField: 'campaign_owner', reviewerField: null, approverField: null, assigneeField: null, orgScopeField: 'department_id', defaultOwnerRole: 'training.module_lead', canDelegate: true, delegateRoles: ['training.operator'], canReassign: true, reassignRoles: ['training.module_lead'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
    { entityType: 'training_course', ownerField: 'author', reviewerField: 'reviewer', approverField: null, assigneeField: null, orgScopeField: null, defaultOwnerRole: 'training.contributor', canDelegate: false, delegateRoles: [], canReassign: true, reassignRoles: ['training.module_lead'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
  ],
  sodRules: [
    { ruleCode: 'training.sod.author_approver', descriptionEn: 'Content author cannot approve their own training content', descriptionAr: 'لا يمكن لمؤلف المحتوى الموافقة على محتواه التدريبي', conflictingRoles: [], conflictingActions: ['training.content.create', 'training.content.approve'], conflictingTransitions: ['draft->approved'], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['peer_review'], overrideAuthority: ['training.executive_owner'], auditObligations: ['log_sod_violation'] },
    { ruleCode: 'training.sod.trainer_certifier', descriptionEn: 'Trainer cannot certify their own completion', descriptionAr: 'لا يمكن للمدرب اعتماد إكماله الخاص', conflictingRoles: [], conflictingActions: ['training.assignment.complete', 'training.certificate.issue'], conflictingTransitions: [], severity: 'medium', enforcement: 'warn', temporaryWaiverAllowed: true, waiverMaxDays: 7, compensatingControls: ['manager_attestation'], overrideAuthority: ['training.module_lead'], auditObligations: ['log_sod_violation'] },
  ],
    mcpServiceEntrypoint: 'modules/training/services/training-advanced.service'
};

registerModule(TRAINING_MANIFEST);

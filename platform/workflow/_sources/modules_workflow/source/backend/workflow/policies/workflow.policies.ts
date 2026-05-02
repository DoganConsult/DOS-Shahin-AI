import { ModulePolicy } from '@dos/types';

/**
 * Workflow Module Policy
 *
 * Governs workflow execution, task assignment, and approval
 * routing. 5-year retention covers standard process audit
 * requirements.
 */
export const WORKFLOW_POLICY: ModulePolicy = {
  moduleCode: 'workflow',

  dataRetention: {
    retentionDays: 1825, // 5 years — process audit trail
    archiveAfterDays: 1460, // Archive after 4 years, retain 1 more
    purgeStrategy: 'archive',
    piiFields: [],
    legalHoldSupported: true,
    legalHoldField: 'legal_hold',
  },

  accessScope: {
    defaultVisibility: 'org',
    rowLevelSecurity: false,
    fieldLevelRestrictions: [],
  },

  automationGuardrails: {
    autoApprovable: ['workflow.instance.start', 'task.item.assign', 'task.item.auto_approve'],
    requireHumanApproval: ['workflow.instance.delete', 'approval.request.override'],
    maxAutoActionsPerHour: 200,
  },
  aiGuardrails: {
    allowedAiActions: ['workflow.instance.draft', 'workflow.instance.recommend', 'workflow.instance.summarize'],
    blockedAiActions: ['workflow.instance.delete', 'workflow.instance.approve'],
    requireHumanReview: ['workflow.instance.approve'],
    maxAiActionsPerHour: 100,
    promptInjectionProtection: true,
    outputValidation: true,
  },

  dataResidency: {
    allowedRegions: ['sa-riyadh', 'me-central'],
    defaultRegion: 'sa-riyadh',
    crossBorderTransferAllowed: false,
    crossBorderApprovalRequired: true,
  },

  exportImport: {
    exportAllowed: true,
    exportFormats: ['csv', 'xlsx', 'pdf', 'json'],
    exportRequiresApproval: true,
    exportApproverRole: 'workflow_manager',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['workflow.instance.approve', 'workflow.instance.close'],
    requiredForApprovals: true,
    minimumEvidenceCount: 1,
    allowedEvidenceTypes: ['document', 'screenshot', 'link', 'attestation', 'system_generated'],
  },

  auditLogging: {
    logAllReads: true,
    logAllWrites: true,
    logFieldChanges: true,
    sensitiveFieldsRedacted: true,
    retentionDays: 2555,
  },

  fieldSensitivity: [],

  lifecycleRules: {
    requiredModules: [],
    optionalEnhancements: ['notification'],
  },
};

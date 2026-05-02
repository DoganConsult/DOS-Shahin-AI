import { ModulePolicy } from '@dos/types';

/**
 * Action Module Policy
 *
 * Governs general action items and task tracking across the GRC
 * platform. 3-year retention is sufficient for operational task
 * history as actions are typically short-lived work items.
 */
export const ACTION_POLICY: ModulePolicy = {
  moduleCode: 'action',

  dataRetention: {
    retentionDays: 1095, // 3 years — operational task history
    archiveAfterDays: 730, // Archive after 2 years
    purgeStrategy: 'soft_delete',
    piiFields: ['assignee_name', 'assignee_email'],
    legalHoldSupported: true,
    legalHoldField: 'legal_hold',
  },

  accessScope: {
    defaultVisibility: 'team',
    rowLevelSecurity: true,
    fieldLevelRestrictions: [],
  },

  automationGuardrails: {
    autoApprovable: ['action.item.create', 'action.item.assign'],
    requireHumanApproval: ['action.item.close'],
    maxAutoActionsPerHour: 100,
  },
  aiGuardrails: {
    allowedAiActions: ['action.item.draft', 'action.item.recommend', 'action.item.summarize'],
    blockedAiActions: ['action.item.delete', 'action.item.approve'],
    requireHumanReview: ['action.item.approve'],
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
    exportApproverRole: 'action_manager',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['action.item.approve', 'action.item.close'],
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

  fieldSensitivity: [
    {
      field: 'action_notes',
      classification: 'internal',
      maskInLogs: false,
      encryptAtRest: false,
    },
  ],

  lifecycleRules: {
    requiredModules: [],
    optionalEnhancements: ['workflow', 'notification'],
  },
};

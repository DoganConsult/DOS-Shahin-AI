import { ModulePolicy } from '@dos/types';

export const INBOX_POLICY: ModulePolicy = {
  moduleCode: 'inbox',

  dataRetention: {
    retentionDays: 365,
    archiveAfterDays: 180,
    purgeStrategy: 'soft_delete',
    piiFields: ['sender_name', 'sender_email'],
    legalHoldSupported: true,
    legalHoldField: 'legal_hold',
  },

  accessScope: {
    defaultVisibility: 'team',
    rowLevelSecurity: true,
    fieldLevelRestrictions: [

    ],
  },

  automationGuardrails: {
    autoApprovable: [],
    requireHumanApproval: [],
    maxAutoActionsPerHour: 100,
  },
  aiGuardrails: {
    allowedAiActions: ['inbox.message.draft', 'inbox.message.recommend', 'inbox.message.summarize'],
    blockedAiActions: ['inbox.item.delete', 'inbox.message.approve'],
    requireHumanReview: ['inbox.message.approve'],
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
    exportApproverRole: 'inbox_manager',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['inbox.message.approve', 'inbox.message.close'],
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
      field: 'message_body',
      classification: 'internal',
      maskInLogs: false,
      encryptAtRest: false,
    },
  ],

  lifecycleRules: {
    requiredModules: [],
    optionalEnhancements: [],
  },
};

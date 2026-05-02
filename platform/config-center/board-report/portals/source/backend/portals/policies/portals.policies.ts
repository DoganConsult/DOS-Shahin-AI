import { ModulePolicy } from '@dos/types';

export const PORTALS_POLICY: ModulePolicy = {
  moduleCode: 'portals',

  dataRetention: {
    retentionDays: 730,
    archiveAfterDays: 365,
    purgeStrategy: 'soft_delete',
    piiFields: ['portal_user_email', 'portal_user_name'],
    legalHoldSupported: true,
    legalHoldField: 'legal_hold',
  },

  accessScope: {
    defaultVisibility: 'org',
    rowLevelSecurity: true,
    fieldLevelRestrictions: [

    ],
  },

  automationGuardrails: {
    autoApprovable: [],
    requireHumanApproval: ['portal.page.delete'],
    maxAutoActionsPerHour: 30,
  },
  aiGuardrails: {
    allowedAiActions: ['portals.page.draft', 'portals.page.recommend', 'portals.page.summarize'],
    blockedAiActions: ['portals.record.delete', 'portals.record.approve'],
    requireHumanReview: ['portals.record.approve'],
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
    exportApproverRole: 'portals_manager',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['portals.record.approve', 'portals.page.close'],
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
      field: 'portal_user_email',
      classification: 'confidential',
      maskInLogs: true,
      encryptAtRest: false,
    },
  ],

  lifecycleRules: {
    requiredModules: [],
    optionalEnhancements: [],
  },
};

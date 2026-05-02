import { ModulePolicy } from '@dos/types';

export const ISSUES_POLICY: ModulePolicy = {
  moduleCode: 'issues',

  dataRetention: {
    retentionDays: 2555,
    archiveAfterDays: 1825,
    purgeStrategy: 'archive',
    piiFields: ['reporter_name', 'reporter_email'],
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
    autoApprovable: ['issue.record.assign'],
    requireHumanApproval: ['issue.record.close', 'issue.record.delete'],
    maxAutoActionsPerHour: 60,
  },
  aiGuardrails: {
    allowedAiActions: ['issues.record.draft', 'issues.record.recommend', 'issues.record.summarize'],
    blockedAiActions: ['issues.record.delete', 'issues.record.approve'],
    requireHumanReview: ['issues.record.approve'],
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
    exportApproverRole: 'issues_manager',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['issues.record.approve', 'issues.record.close'],
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
      field: 'issue_description',
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

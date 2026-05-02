import { ModulePolicy } from '@dos/types';

export const PRIVACY_POLICY: ModulePolicy = {
  moduleCode: 'privacy',

  dataRetention: {
    retentionDays: 3650,
    archiveAfterDays: 2555,
    purgeStrategy: 'archive',
    piiFields: ['data_subject_name', 'data_subject_email', 'data_subject_id'],
    legalHoldSupported: true,
    legalHoldField: 'legal_hold',
  },

  accessScope: {
    defaultVisibility: 'department',
    rowLevelSecurity: true,
    fieldLevelRestrictions: [
      { field: 'data_subject_details', visibleToRoles: ['privacy_officer', 'admin'] },
    ],
  },

  automationGuardrails: {
    autoApprovable: ['consent.record.create'],
    requireHumanApproval: ['dsr.request.complete', 'breach.incident.notify'],
    maxAutoActionsPerHour: 30,
  },
  aiGuardrails: {
    allowedAiActions: ['privacy.record.draft', 'privacy.record.recommend', 'privacy.record.summarize'],
    blockedAiActions: ['privacy.record.delete', 'privacy.record.approve'],
    requireHumanReview: ['privacy.record.approve'],
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
    exportApproverRole: 'privacy_manager',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['privacy.record.approve', 'privacy.record.close'],
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
      field: 'data_subject_name',
      classification: 'restricted',
      maskInLogs: true,
      encryptAtRest: true,
    },
    {
      field: 'data_subject_email',
      classification: 'restricted',
      maskInLogs: true,
      encryptAtRest: true,
    },
  ],

  lifecycleRules: {
    requiredModules: [],
    optionalEnhancements: [],
  },
};

import { ModulePolicy } from '@dos/types';

/**
 * Training Module Policy
 *
 * Governs training program management, course assignments, and
 * certification tracking. 5-year retention supports regulatory
 * competency audit trails.
 */
export const TRAINING_POLICY: ModulePolicy = {
  moduleCode: 'training',

  dataRetention: {
    retentionDays: 1825, // 5 years — competency audit trail
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
    autoApprovable: ['training.record.assign', 'training.record.create'],
    requireHumanApproval: ['training.record.certify'],
    maxAutoActionsPerHour: 100,
  },
  aiGuardrails: {
    allowedAiActions: ['training.record.draft', 'training.record.recommend', 'training.record.summarize'],
    blockedAiActions: ['training.record.delete', 'training.record.approve'],
    requireHumanReview: ['training.record.approve'],
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
    exportApproverRole: 'training_manager',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['training.record.approve', 'training.record.close'],
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
    optionalEnhancements: ['compliance', 'notification'],
  },
};

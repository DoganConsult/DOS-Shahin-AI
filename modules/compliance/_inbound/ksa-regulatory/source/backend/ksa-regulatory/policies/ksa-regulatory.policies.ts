import { ModulePolicy } from '@dos/types';

export const KSA_REGULATORY_POLICY: ModulePolicy = {
  moduleCode: 'ksa-regulatory',

  dataRetention: {
    retentionDays: 3650,
    archiveAfterDays: 2555,
    purgeStrategy: 'soft_delete',
    piiFields: [],
    legalHoldSupported: true,
    legalHoldField: 'legal_hold',
  },

  accessScope: {
    defaultVisibility: 'org',
    rowLevelSecurity: true,
    fieldLevelRestrictions: [],
  },

  automationGuardrails: {
    autoApprovable: ['ksa-regulatory.change.track', 'ksa-regulatory.snapshot.create'],
    requireHumanApproval: ['ksa-regulatory.obligation.approve', 'ksa-regulatory.mapping.publish'],
    maxAutoActionsPerHour: 50,
  },

  aiGuardrails: {
    allowedAiActions: ['ksa-regulatory.change.summarize', 'ksa-regulatory.maturity.recommend', 'ksa-regulatory.mapping.suggest'],
    blockedAiActions: ['ksa-regulatory.obligation.approve', 'ksa-regulatory.mapping.publish'],
    requireHumanReview: ['ksa-regulatory.obligation.approve'],
    maxAiActionsPerHour: 50,
    promptInjectionProtection: true,
    outputValidation: true,
  },

  dataResidency: {
    allowedRegions: ['sa-riyadh'],
    defaultRegion: 'sa-riyadh',
    crossBorderTransferAllowed: false,
    crossBorderApprovalRequired: true,
  },

  exportImport: {
    exportAllowed: true,
    exportFormats: ['csv', 'xlsx', 'pdf', 'json'],
    exportRequiresApproval: true,
    exportApproverRole: 'ksa_regulatory_manager',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['ksa-regulatory.obligation.approve'],
    requiredForApprovals: true,
    minimumEvidenceCount: 1,
    allowedEvidenceTypes: ['document', 'screenshot', 'link', 'attestation', 'system_generated'],
  },

  auditLogging: {
    logAllReads: true,
    logAllWrites: true,
    logFieldChanges: true,
    sensitiveFieldsRedacted: true,
    retentionDays: 3650,
  },

  fieldSensitivity: [],

  lifecycleRules: {
    requiredModules: ['compliance'],
    optionalEnhancements: ['risk', 'policy', 'workflow', 'notification'],
  },
};

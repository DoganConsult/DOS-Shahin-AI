import { ModulePolicy } from '@dos/types';

/**
 * Qiyas Module Policy
 *
 * Governs maturity assessments, scoring models, and benchmark
 * publications. 5-year retention aligns with GRC maturity
 * measurement cycles.
 */
export const QIYAS_POLICY: ModulePolicy = {
  moduleCode: 'qiyas',

  dataRetention: {
    retentionDays: 1825, // 5 years — maturity assessment history
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
    autoApprovable: ['qiyas.assessment.run', 'qiyas.assessment.score'],
    requireHumanApproval: ['qiyas.assessment.publish'],
    maxAutoActionsPerHour: 50,
  },
  aiGuardrails: {
    allowedAiActions: ['qiyas.assessment.draft', 'qiyas.assessment.recommend', 'qiyas.assessment.summarize'],
    blockedAiActions: ['qiyas.assessment.delete', 'qiyas.assessment.approve'],
    requireHumanReview: ['qiyas.assessment.approve'],
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
    exportApproverRole: 'qiyas_manager',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['qiyas.assessment.approve', 'qiyas.assessment.close'],
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
    requiredModules: ['compliance', 'risk'],
    optionalEnhancements: [],
  },
};

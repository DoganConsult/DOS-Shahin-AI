import { ModulePolicy } from '@dos/types';

/**
 * Risk Module Policy
 *
 * Governs enterprise risk management data including risk registers,
 * assessments, and treatment plans. 7-year retention aligns with
 * financial regulatory requirements (Basel III/IV, SOX).
 */
export const RISK_POLICY: ModulePolicy = {
  moduleCode: 'risk',

  dataRetention: {
    retentionDays: 2555, // 7 years — financial regulatory minimum
    archiveAfterDays: 1825, // Archive after 5 years, retain 2 more
    purgeStrategy: 'archive',
    piiFields: ['risk_owner_name', 'risk_owner_email'],
    legalHoldSupported: true,
    legalHoldField: 'legal_hold',
  },

  accessScope: {
    defaultVisibility: 'org',
    rowLevelSecurity: true,
    fieldLevelRestrictions: [
      {
        field: 'financial_impact',
        visibleToRoles: ['owner', 'admin', 'risk_manager'],
      },
    ],
  },

  automationGuardrails: {
    autoApprovable: ['risk.record.create', 'risk.record.assign'],
    requireHumanApproval: ['risk.record.delete', 'risk.record.approve'],
    maxAutoActionsPerHour: 50,
  },

  aiGuardrails: {
    allowedAiActions: ['risk.record.draft', 'risk.record.recommend', 'risk.record.assess'],
    blockedAiActions: ['risk.record.delete', 'risk.record.approve'],
    requireHumanReview: ['risk.record.approve', 'risk.record.assess'],
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
    exportApproverRole: 'risk_manager',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['risk.record.approve', 'risk.record.close'],
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
      field: 'financial_impact',
      classification: 'confidential',
      maskInLogs: true,
      encryptAtRest: true,
    },
    {
      field: 'risk_description',
      classification: 'internal',
      maskInLogs: false,
      encryptAtRest: false,
    },
  ],

  lifecycleRules: {
    requiredModules: ['compliance'],
    optionalEnhancements: ['evidence', 'workflow'],
  },
};

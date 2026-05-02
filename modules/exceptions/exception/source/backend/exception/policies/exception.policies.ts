import { ModulePolicy } from '@dos/types';

/**
 * Exception Module Policy
 *
 * Governs control exceptions and compensating control arrangements.
 * 5-year retention covers exception validity periods and supports
 * auditor review of historical exception decisions.
 */
export const EXCEPTION_POLICY: ModulePolicy = {
  moduleCode: 'exception',

  dataRetention: {
    retentionDays: 1825, // 5 years — exception validity + review window
    archiveAfterDays: 1095, // Archive after 3 years
    purgeStrategy: 'archive',
    piiFields: ['requestor_name', 'approver_name'],
    legalHoldSupported: true,
    legalHoldField: 'legal_hold',
  },

  accessScope: {
    defaultVisibility: 'org',
    rowLevelSecurity: true,
    fieldLevelRestrictions: [
      {
        field: 'compensating_control_details',
        visibleToRoles: ['owner', 'admin', 'compliance_officer', 'risk_manager'],
      },
    ],
  },

  automationGuardrails: {
    autoApprovable: ['exception.record.request'],
    requireHumanApproval: ['exception.record.approve', 'exception.record.extend'],
    maxAutoActionsPerHour: 20,
  },

  aiGuardrails: {
    allowedAiActions: ['exception.record.draft', 'exception.record.recommend'],
    blockedAiActions: ['exception.record.approve', 'exception.record.extend', 'exception.record.delete'],
    requireHumanReview: ['exception.record.approve', 'exception.record.extend'],
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
    exportApproverRole: 'compliance_officer',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['exception.record.approve', 'exception.record.extend'],
    requiredForApprovals: true,
    minimumEvidenceCount: 1,
    allowedEvidenceTypes: ['document', 'screenshot', 'link', 'attestation', 'system_generated'],
  },

  auditLogging: {
    logAllReads: false,
    logAllWrites: true,
    logFieldChanges: true,
    sensitiveFieldsRedacted: true,
    retentionDays: 2555,
  },

  fieldSensitivity: [
    {
      field: 'exception_justification',
      classification: 'confidential',
      maskInLogs: true,
      encryptAtRest: false,
    },
    {
      field: 'compensating_control_details',
      classification: 'internal',
      maskInLogs: false,
      encryptAtRest: false,
    },
  ],

  lifecycleRules: {
    requiredModules: ['compliance', 'risk'],
    optionalEnhancements: ['workflow', 'audit'],
  },
};

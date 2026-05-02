import { ModulePolicy } from '@dos/types';

/**
 * Vendor Module Policy
 *
 * Governs third-party vendor risk management including onboarding,
 * due diligence, ongoing monitoring, and termination. 7-year retention
 * covers contractual obligation periods and regulatory inquiry windows.
 * Contains significant PII from vendor contact records.
 */
export const VENDOR_POLICY: ModulePolicy = {
  moduleCode: 'vendor',

  dataRetention: {
    retentionDays: 2555, // 7 years — contractual + regulatory window
    archiveAfterDays: 1825, // Archive after 5 years
    purgeStrategy: 'archive',
    piiFields: ['contact_name', 'contact_email', 'contact_phone'],
    legalHoldSupported: true,
    legalHoldField: 'legal_hold',
  },

  accessScope: {
    defaultVisibility: 'department',
    rowLevelSecurity: true,
    fieldLevelRestrictions: [
      {
        field: 'due_diligence_report',
        visibleToRoles: ['owner', 'admin', 'vendor_manager', 'risk_manager'],
      },
      {
        field: 'contract_value',
        visibleToRoles: ['owner', 'admin', 'vendor_manager'],
      },
    ],
  },

  automationGuardrails: {
    autoApprovable: ['vendor.record.create', 'vendor.record.update'],
    requireHumanApproval: ['vendor.record.approve', 'vendor.record.terminate'],
    maxAutoActionsPerHour: 30,
  },

  aiGuardrails: {
    allowedAiActions: ['vendor.record.draft', 'vendor.record.recommend', 'vendor.record.assess'],
    blockedAiActions: ['vendor.record.approve', 'vendor.record.terminate', 'vendor.record.delete'],
    requireHumanReview: ['vendor.record.approve', 'vendor.record.terminate'],
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
    exportApproverRole: 'vendor_manager',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['vendor.record.approve', 'vendor.record.terminate'],
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
      field: 'contact_name',
      classification: 'confidential',
      maskInLogs: true,
      encryptAtRest: false,
    },
    {
      field: 'contact_email',
      classification: 'confidential',
      maskInLogs: true,
      encryptAtRest: false,
    },
    {
      field: 'contact_phone',
      classification: 'confidential',
      maskInLogs: true,
      encryptAtRest: false,
    },
    {
      field: 'due_diligence_report',
      classification: 'confidential',
      maskInLogs: true,
      encryptAtRest: true,
    },
  ],

  lifecycleRules: {
    requiredModules: ['risk'],
    optionalEnhancements: ['compliance', 'evidence', 'workflow'],
  },
};

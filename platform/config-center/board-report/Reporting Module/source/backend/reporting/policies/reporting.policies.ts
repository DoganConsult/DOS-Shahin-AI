import { ModulePolicy } from '@dos/types';

/**
 * Reporting Module Policy
 *
 * Governs report generation, scheduling, and external publication.
 * 5-year retention covers standard regulatory reporting periods.
 */
export const REPORTING_POLICY: ModulePolicy = {
  moduleCode: 'reporting',

  dataRetention: {
    retentionDays: 1825, // 5 years — regulatory reporting period
    archiveAfterDays: 1460, // Archive after 4 years, retain 1 more
    purgeStrategy: 'archive',
    piiFields: [],
    legalHoldSupported: true,
    legalHoldField: 'legal_hold',
  },

  accessScope: {
    defaultVisibility: 'department',
    rowLevelSecurity: false,
    fieldLevelRestrictions: [],
  },

  automationGuardrails: {
    autoApprovable: ['report.document.generate', 'report.document.schedule'],
    requireHumanApproval: ['report.document.publish_external'],
    maxAutoActionsPerHour: 50,
  },
  aiGuardrails: {
    allowedAiActions: ['reporting.document.draft', 'reporting.document.recommend', 'reporting.document.summarize'],
    blockedAiActions: ['reporting.document.delete', 'reporting.document.approve'],
    requireHumanReview: ['reporting.document.approve'],
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
    exportApproverRole: 'reporting_manager',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['reporting.document.approve', 'reporting.document.close'],
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
    optionalEnhancements: ['analytics', 'compliance', 'risk', 'audit'],
  },
};

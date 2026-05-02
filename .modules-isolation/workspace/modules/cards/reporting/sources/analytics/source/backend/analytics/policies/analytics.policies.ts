import { ModulePolicy } from '@dos/types';

/**
 * Analytics Module Policy
 *
 * Governs KPI computation, dashboard analytics, and external
 * data exports. 3-year retention balances historical trend
 * analysis with storage efficiency.
 */
export const ANALYTICS_POLICY: ModulePolicy = {
  moduleCode: 'analytics',

  dataRetention: {
    retentionDays: 1095, // 3 years — trend analysis window
    archiveAfterDays: 730, // Archive after 2 years, retain 1 more
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
    autoApprovable: ['analytics.report.compute', 'kpi.metric.refresh'],
    requireHumanApproval: ['analytics.report.export_external'],
    maxAutoActionsPerHour: 50,
  },
  aiGuardrails: {
    allowedAiActions: ['analytics.report.draft', 'analytics.report.recommend', 'analytics.report.summarize'],
    blockedAiActions: ['analytics.report.delete', 'analytics.report.approve'],
    requireHumanReview: ['analytics.report.approve'],
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
    exportApproverRole: 'analytics_manager',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['analytics.report.approve', 'analytics.report.close'],
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
    optionalEnhancements: ['risk', 'compliance', 'audit'],
  },
};

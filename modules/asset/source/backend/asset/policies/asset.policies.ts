import { ModulePolicy } from '@dos/types';

/**
 * Asset Module Policy
 *
 * Governs information asset inventory, classification, ownership, and
 * lifecycle management. 7-year retention covers asset depreciation
 * cycles and supports historical asset-to-risk mapping analysis.
 */
export const ASSET_POLICY: ModulePolicy = {
  moduleCode: 'asset',

  dataRetention: {
    retentionDays: 2555, // 7 years — asset depreciation cycle
    archiveAfterDays: 1825, // Archive after 5 years
    purgeStrategy: 'archive',
    piiFields: ['asset_owner_name', 'asset_custodian_name'],
    legalHoldSupported: true,
    legalHoldField: 'legal_hold',
  },

  accessScope: {
    defaultVisibility: 'department',
    rowLevelSecurity: true,
    fieldLevelRestrictions: [
      {
        field: 'asset_valuation',
        visibleToRoles: ['owner', 'admin', 'asset_manager', 'risk_manager'],
      },
    ],
  },

  automationGuardrails: {
    autoApprovable: ['asset.record.create', 'asset.record.update'],
    requireHumanApproval: ['asset.record.decommission'],
    maxAutoActionsPerHour: 60,
  },
  aiGuardrails: {
    allowedAiActions: ['asset.record.draft', 'asset.record.recommend', 'asset.record.summarize'],
    blockedAiActions: ['asset.record.delete', 'asset.record.approve'],
    requireHumanReview: ['asset.record.approve'],
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
    exportApproverRole: 'asset_manager',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['asset.record.approve', 'asset.record.close'],
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
      field: 'asset_valuation',
      classification: 'confidential',
      maskInLogs: true,
      encryptAtRest: false,
    },
    {
      field: 'network_location',
      classification: 'confidential',
      maskInLogs: true,
      encryptAtRest: false,
    },
  ],

  lifecycleRules: {
    requiredModules: [],
    optionalEnhancements: ['risk', 'compliance'],
  },
};

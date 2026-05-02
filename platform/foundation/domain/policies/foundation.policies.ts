import { ModulePolicy } from '@dos/types';

export const FOUNDATION_POLICY: ModulePolicy = {
  moduleCode: 'foundation',
  dataRetention: {
    retentionDays: 3650,
    archiveAfterDays: 2555,
    purgeStrategy: 'archive',
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
    autoApprovable: ['foundation.record.create'],
    requireHumanApproval: ['foundation.record.delete', 'foundation.record.approve'],
    maxAutoActionsPerHour: 30,
  },
  aiGuardrails: {
    allowedAiActions: ['foundation.record.draft'],
    blockedAiActions: ['foundation.record.delete', 'foundation.record.approve'],
    requireHumanReview: ['foundation.record.approve'],
    maxAiActionsPerHour: 50,
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
    exportFormats: ['csv', 'xlsx', 'json'],
    exportRequiresApproval: false,
    exportApproverRole: null,
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },
  auditLogging: {
    logAllReads: false,
    logAllWrites: true,
    logFieldChanges: true,
    sensitiveFieldsRedacted: false,
    retentionDays: 3650,
  },
  fieldSensitivity: [],
  lifecycleRules: {
    requiredModules: [],
    optionalEnhancements: ['workflow'],
  },
};

import { ModulePolicy } from '@dos/types';

/**
 * Notification Module Policy
 *
 * Governs notification delivery, bulk sends, and template
 * management. 1-year retention with soft-delete keeps
 * notification history lean while preserving audit context.
 */
export const NOTIFICATION_POLICY: ModulePolicy = {
  moduleCode: 'notification',

  dataRetention: {
    retentionDays: 365, // 1 year — short-lived operational data
    archiveAfterDays: 270, // Archive after 9 months, retain 3 more
    purgeStrategy: 'soft_delete',
    piiFields: [],
    legalHoldSupported: true,
    legalHoldField: 'legal_hold',
  },

  accessScope: {
    defaultVisibility: 'team',
    rowLevelSecurity: false,
    fieldLevelRestrictions: [],
  },

  automationGuardrails: {
    autoApprovable: ['notification.alert.send', 'notification.alert.bulk_send'],
    requireHumanApproval: ['notification.alert.template_delete'],
    maxAutoActionsPerHour: 1000,
  },
  aiGuardrails: {
    allowedAiActions: ['notification.alert.draft', 'notification.alert.recommend', 'notification.alert.summarize'],
    blockedAiActions: ['notification.alert.delete', 'notification.alert.approve'],
    requireHumanReview: ['notification.alert.approve'],
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
    exportApproverRole: 'notification_manager',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['notification.alert.approve', 'notification.alert.close'],
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
    optionalEnhancements: [],
  },
};

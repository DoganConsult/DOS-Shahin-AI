import { ModulePolicy } from '@dos/types';

/**
 * Integrations Module Policy
 *
 * Governs third-party connectors, webhook management, and
 * synchronisation jobs. Restricted-level sensitivity for
 * credentials and secrets.
 */
export const INTEGRATIONS_POLICY: ModulePolicy = {
  moduleCode: 'integrations',

  dataRetention: {
    retentionDays: 1825, // 5 years — integration audit trail
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
    autoApprovable: ['connector.instance.sync', 'webhook.endpoint.send'],
    requireHumanApproval: ['connector.instance.create', 'connector.instance.delete'],
    maxAutoActionsPerHour: 50,
  },
  aiGuardrails: {
    allowedAiActions: ['integrations.connector.draft', 'integrations.connector.recommend', 'integrations.connector.summarize'],
    blockedAiActions: ['integrations.connector.delete', 'integrations.connector.approve'],
    requireHumanReview: ['integrations.connector.approve'],
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
    exportApproverRole: 'integrations_manager',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['integrations.connector.approve', 'integrations.connector.close'],
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
      field: 'api_key',
      classification: 'restricted',
      maskInLogs: true,
      encryptAtRest: true,
    },
    {
      field: 'webhook_secret',
      classification: 'restricted',
      maskInLogs: true,
      encryptAtRest: true,
    },
  ],

  lifecycleRules: {
    requiredModules: [],
    optionalEnhancements: [],
  },
};

import { ModulePolicy } from '@dos/types';

/**
 * Evidence Module Policy
 *
 * Governs evidence collection, storage, validation, and retention for
 * control compliance demonstration. 10-year retention satisfies audit
 * trail requirements across most regulatory frameworks.
 */
export const EVIDENCE_POLICY: ModulePolicy = {
  moduleCode: 'evidence',

  dataRetention: {
    retentionDays: 3650, // 10 years — audit trail preservation
    archiveAfterDays: 2555, // Archive after 7 years
    purgeStrategy: 'archive',
    piiFields: ['collector_name', 'collector_email'],
    legalHoldSupported: true,
    legalHoldField: 'legal_hold',
  },

  accessScope: {
    defaultVisibility: 'team',
    rowLevelSecurity: true,
    fieldLevelRestrictions: [
      {
        field: 'evidence_content',
        visibleToRoles: ['owner', 'admin', 'auditor', 'compliance_officer'],
      },
    ],
  },

  automationGuardrails: {
    autoApprovable: ['evidence.item.upload'],
    requireHumanApproval: ['evidence.item.approve', 'evidence.item.delete'],
    maxAutoActionsPerHour: 100,
  },

  aiGuardrails: {
    allowedAiActions: ['evidence.item.classify', 'evidence.item.recommend', 'evidence.item.validate'],
    blockedAiActions: ['evidence.item.approve', 'evidence.item.delete'],
    requireHumanReview: ['evidence.item.approve'],
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
    requiredForStatusChanges: ['evidence.item.approve'],
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
      field: 'evidence_content',
      classification: 'confidential',
      maskInLogs: true,
      encryptAtRest: true,
    },
    {
      field: 'validation_notes',
      classification: 'internal',
      maskInLogs: false,
      encryptAtRest: false,
    },
  ],

  lifecycleRules: {
    requiredModules: ['compliance'],
    optionalEnhancements: ['audit', 'integrations'],
  },
};

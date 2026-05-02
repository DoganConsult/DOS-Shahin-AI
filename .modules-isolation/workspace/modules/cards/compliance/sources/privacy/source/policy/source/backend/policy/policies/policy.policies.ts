import { ModulePolicy } from '@dos/types';

/**
 * Policy Module Policy
 *
 * Governs organizational policies, standards, and procedures lifecycle
 * including drafting, review, approval, publication, and retirement.
 * 10-year retention ensures historical policy versions remain available
 * for regulatory inquiries.
 */
export const POLICY_POLICY: ModulePolicy = {
  moduleCode: 'policy',

  dataRetention: {
    retentionDays: 3650, // 10 years — full policy version history
    archiveAfterDays: 2555, // Archive after 7 years
    purgeStrategy: 'archive',
    piiFields: ['author_name', 'approver_name'],
    legalHoldSupported: true,
    legalHoldField: 'legal_hold',
  },

  accessScope: {
    defaultVisibility: 'org',
    rowLevelSecurity: true,
    fieldLevelRestrictions: [
      {
        field: 'draft_content',
        visibleToRoles: ['owner', 'admin', 'compliance_officer', 'policy_author'],
      },
    ],
  },

  automationGuardrails: {
    autoApprovable: ['policy.document.create_draft'],
    requireHumanApproval: ['policy.document.publish', 'policy.document.retire'],
    maxAutoActionsPerHour: 30,
  },

  aiGuardrails: {
    allowedAiActions: ['policy.document.draft', 'policy.document.recommend', 'policy.document.summarize'],
    blockedAiActions: ['policy.document.publish', 'policy.document.retire', 'policy.document.delete'],
    requireHumanReview: ['policy.document.publish', 'policy.document.retire'],
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
    exportRequiresApproval: false,
    exportApproverRole: null,
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['policy.document.publish', 'policy.document.retire'],
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
      field: 'draft_content',
      classification: 'internal',
      maskInLogs: false,
      encryptAtRest: false,
    },
    {
      field: 'approval_comments',
      classification: 'internal',
      maskInLogs: false,
      encryptAtRest: false,
    },
  ],

  lifecycleRules: {
    requiredModules: ['compliance'],
    optionalEnhancements: ['workflow', 'notification'],
  },
};

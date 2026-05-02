import { ModulePolicy } from '@dos/types';

/**
 * Governance Module Policy
 *
 * Governs organizational governance structures including charters,
 * committee mandates, delegations of authority, and board-level
 * reporting. Global visibility by default as governance artifacts
 * set the tone for the entire organization. RLS disabled since
 * governance records should be universally accessible.
 */
export const GOVERNANCE_POLICY: ModulePolicy = {
  moduleCode: 'governance',

  dataRetention: {
    retentionDays: 3650, // 10 years — corporate governance records
    archiveAfterDays: 2555, // Archive after 7 years
    purgeStrategy: 'archive',
    piiFields: ['committee_chair_name', 'delegate_name'],
    legalHoldSupported: true,
    legalHoldField: 'legal_hold',
  },

  accessScope: {
    defaultVisibility: 'global',
    rowLevelSecurity: false,
    fieldLevelRestrictions: [],
  },

  automationGuardrails: {
    autoApprovable: ['governance.record.acknowledge'],
    requireHumanApproval: ['charter.document.approve', 'delegation.chain.create'],
    maxAutoActionsPerHour: 20,
  },

  aiGuardrails: {
    allowedAiActions: ['governance.record.draft', 'governance.record.summarize', 'governance.record.recommend'],
    blockedAiActions: ['charter.document.approve', 'delegation.chain.create', 'governance.record.delete'],
    requireHumanReview: ['charter.document.approve', 'delegation.chain.create'],
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
    requiredForStatusChanges: ['charter.document.approve', 'delegation.chain.create'],
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
      field: 'charter_content',
      classification: 'internal',
      maskInLogs: false,
      encryptAtRest: false,
    },
    {
      field: 'delegation_scope',
      classification: 'internal',
      maskInLogs: false,
      encryptAtRest: false,
    },
  ],

  lifecycleRules: {
    requiredModules: [],
    optionalEnhancements: ['compliance', 'risk', 'audit'],
  },
};

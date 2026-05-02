import { ModulePolicy } from '@dos/types';

export const LOCAL_KNOWLEDGE_POLICY: ModulePolicy = {
  moduleCode: 'local-knowledge',

  dataRetention: {
    retentionDays: 1825,
    archiveAfterDays: 1095,
    purgeStrategy: 'soft_delete',
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
    autoApprovable: ['local-knowledge.document.ingest', 'local-knowledge.source.sync'],
    requireHumanApproval: ['local-knowledge.source.delete', 'local-knowledge.reindex.full'],
    maxAutoActionsPerHour: 200,
  },

  aiGuardrails: {
    allowedAiActions: ['local-knowledge.search.semantic', 'local-knowledge.document.summarize', 'local-knowledge.chunk.embed'],
    blockedAiActions: ['local-knowledge.source.delete'],
    requireHumanReview: [],
    maxAiActionsPerHour: 500,
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
    exportFormats: ['json'],
    exportRequiresApproval: true,
    exportApproverRole: 'knowledge_manager',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: [],
    requiredForApprovals: false,
    minimumEvidenceCount: 0,
    allowedEvidenceTypes: ['document', 'link'],
  },

  auditLogging: {
    logAllReads: false,
    logAllWrites: true,
    logFieldChanges: true,
    sensitiveFieldsRedacted: true,
    retentionDays: 1825,
  },

  fieldSensitivity: [],

  lifecycleRules: {
    requiredModules: [],
    optionalEnhancements: ['ai', 'notification'],
  },
};

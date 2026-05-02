import { ModulePolicy } from '@dos/types';

/**
 * AI Governance Module Policy
 *
 * Governs AI system registration, model approval workflows, and
 * data protection impact assessments. 10-year retention meets
 * EU AI Act record-keeping obligations.
 */
export const AI_GOVERNANCE_POLICY: ModulePolicy = {
  moduleCode: 'ai-governance',

  dataRetention: {
    retentionDays: 3650, // 10 years — EU AI Act compliance
    archiveAfterDays: 2555, // Archive after 7 years, retain 3 more
    purgeStrategy: 'archive',
    piiFields: ['model_training_data_sources'],
    legalHoldSupported: true,
    legalHoldField: 'legal_hold',
  },

  accessScope: {
    defaultVisibility: 'global',
    rowLevelSecurity: true,
    fieldLevelRestrictions: [],
  },

  automationGuardrails: {
    autoApprovable: [],
    requireHumanApproval: ['ai_system.record.register', 'ai_model.record.approve', 'dpia.assessment.approve'],
    maxAutoActionsPerHour: 50,
  },
  aiGuardrails: {
    allowedAiActions: ['ai-governance.model.draft', 'ai-governance.model.recommend', 'ai-governance.model.summarize'],
    blockedAiActions: ['ai-governance.model.delete', 'ai-governance.model.approve'],
    requireHumanReview: ['ai-governance.model.approve'],
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
    exportApproverRole: 'ai-governance_manager',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['ai-governance.model.approve', 'ai-governance.model.close'],
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
      field: 'model_weights',
      classification: 'restricted',
      maskInLogs: true,
      encryptAtRest: true,
    },
    {
      field: 'training_data',
      classification: 'confidential',
      maskInLogs: true,
      encryptAtRest: true,
    },
  ],

  lifecycleRules: {
    requiredModules: ['ai', 'governance'],
    optionalEnhancements: ['compliance', 'risk'],
  },
};

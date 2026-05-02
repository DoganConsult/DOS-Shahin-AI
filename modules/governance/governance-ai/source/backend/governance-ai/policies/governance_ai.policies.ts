import { ModulePolicy } from '@dos/types';

export const GOVERNANCE_AI_POLICY: ModulePolicy = {
  moduleCode: 'governance-ai',

  dataRetention: {
    retentionDays: 2555,
    archiveAfterDays: 1825,
    purgeStrategy: 'archive',
    piiFields: [],
    legalHoldSupported: true,
    legalHoldField: 'legal_hold',
  },

  accessScope: {
    defaultVisibility: 'org',
    rowLevelSecurity: true,
    fieldLevelRestrictions: [
      {
        field: 'model_configuration',
        visibleToRoles: ['admin', 'governance_ai_manager'],
      },
      {
        field: 'training_data_reference',
        visibleToRoles: ['admin', 'governance_ai_manager'],
      },
    ],
  },

  automationGuardrails: {
    autoApprovable: ['governance_ai.signal.detect', 'governance_ai.signal.interpret'],
    requireHumanApproval: ['governance_ai.signal.escalate', 'governance_ai.narrative.approve', 'governance_ai.model.deploy'],
    maxAutoActionsPerHour: 500,
  },

  aiGuardrails: {
    allowedAiActions: ['governance_ai.signal.detect', 'governance_ai.signal.interpret', 'governance_ai.narrative.draft'],
    blockedAiActions: ['governance_ai.narrative.approve', 'governance_ai.model.deploy', 'governance_ai.signal.dismiss_critical'],
    requireHumanReview: ['governance_ai.narrative.approve', 'governance_ai.signal.escalate'],
    maxAiActionsPerHour: 1000,
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
    exportFormats: ['csv', 'json', 'pdf'],
    exportRequiresApproval: true,
    exportApproverRole: 'governance_ai_manager',
    importAllowed: false,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['governance_ai.narrative.approve'],
    requiredForApprovals: true,
    minimumEvidenceCount: 1,
    allowedEvidenceTypes: ['document', 'system_generated', 'link'],
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
      field: 'model_configuration',
      classification: 'confidential',
      maskInLogs: true,
      encryptAtRest: true,
    },
    {
      field: 'training_data_reference',
      classification: 'confidential',
      maskInLogs: true,
      encryptAtRest: false,
    },
  ],

  lifecycleRules: {
    requiredModules: ['risk', 'compliance'],
    optionalEnhancements: ['incident', 'controls', 'audit', 'evidence'],
  },
};

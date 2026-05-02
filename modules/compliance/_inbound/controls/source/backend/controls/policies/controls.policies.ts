import { ModulePolicy } from '@dos/types';

export const CONTROLS_POLICY: ModulePolicy = {
  moduleCode: 'controls',

  dataRetention: {
    retentionDays: 2555,
    archiveAfterDays: 1825,
    purgeStrategy: 'archive',
    piiFields: ['control_owner_name', 'control_owner_email'],
    legalHoldSupported: true,
    legalHoldField: 'legal_hold',
  },

  accessScope: {
    defaultVisibility: 'org',
    rowLevelSecurity: true,
    fieldLevelRestrictions: [
      {
        field: 'automation_config',
        visibleToRoles: ['admin', 'controls_manager', 'control_operator'],
      },
      {
        field: 'deficiency_detail',
        visibleToRoles: ['admin', 'controls_manager', 'auditor'],
      },
    ],
  },

  automationGuardrails: {
    autoApprovable: ['controls.control.create', 'controls.control.assign', 'controls.mapping.link'],
    requireHumanApproval: ['controls.control.activate', 'controls.control.retire', 'controls.control.delete', 'controls.test.override'],
    maxAutoActionsPerHour: 100,
  },

  aiGuardrails: {
    allowedAiActions: ['controls.control.draft', 'controls.control.recommend', 'controls.mapping.suggest', 'controls.test.assess'],
    blockedAiActions: ['controls.control.activate', 'controls.control.retire', 'controls.control.delete', 'controls.test.override'],
    requireHumanReview: ['controls.control.activate', 'controls.test.override'],
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
    exportApproverRole: 'controls_manager',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['controls.control.activate', 'controls.control.retire'],
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
      field: 'automation_config',
      classification: 'internal',
      maskInLogs: true,
      encryptAtRest: false,
    },
    {
      field: 'deficiency_detail',
      classification: 'confidential',
      maskInLogs: false,
      encryptAtRest: false,
    },
  ],

  lifecycleRules: {
    requiredModules: ['compliance'],
    optionalEnhancements: ['evidence', 'workflow', 'risk', 'audit'],
  },
};

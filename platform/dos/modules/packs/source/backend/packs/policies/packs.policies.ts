/**
 * Packs -- Module Policy
 *
 * Governs pack catalog, installation, compatibility, and policy evaluation.
 * Platform tier with controlled installation scope and audit requirements.
 *
 * MP-36 Section 10: Settings / Admin / Runtime Control.
 *
 * @owner DOS
 * @module packs
 */

import { ModulePolicy } from '@dos/types';

export const PACKS_POLICY: ModulePolicy = {
  moduleCode: 'packs',

  dataRetention: {
    retentionDays: 730,
    archiveAfterDays: 365,
    purgeStrategy: 'archive',
    piiFields: [],
    legalHoldSupported: false,
    legalHoldField: null,
  },

  accessScope: {
    defaultVisibility: 'org',
    rowLevelSecurity: true,
    fieldLevelRestrictions: [
      {
        field: 'manifest_json',
        visibleToRoles: ['admin', 'platform_admin', 'tenant_admin'],
      },
      {
        field: 'install_log',
        visibleToRoles: ['admin', 'platform_admin'],
      },
    ],
  },

  automationGuardrails: {
    autoApprovable: ['packs.catalog.list', 'packs.installed.list', 'packs.compatibility.check'],
    requireHumanApproval: ['packs.install', 'packs.uninstall', 'packs.policy.update'],
    maxAutoActionsPerHour: 200,
  },

  aiGuardrails: {
    allowedAiActions: [
      'packs.recommend',
      'packs.impact.analyze',
      'packs.compatibility.explain',
    ],
    blockedAiActions: [
      'packs.install.execute',
      'packs.uninstall.execute',
      'packs.policy.modify',
    ],
    requireHumanReview: ['packs.install.execute', 'packs.uninstall.execute'],
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
    exportFormats: ['json'],
    exportRequiresApproval: true,
    exportApproverRole: 'packs.executive_owner',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['approved', 'archived'],
    requiredForApprovals: true,
    minimumEvidenceCount: 0,
    allowedEvidenceTypes: ['json', 'log'],
  },

  auditLogging: {
    logAllReads: false,
    logAllWrites: true,
    logFieldChanges: true,
    sensitiveFieldsRedacted: true,
    retentionDays: 730,
  },

  fieldSensitivity: [
    {
      field: 'manifest_json',
      classification: 'internal',
      maskInLogs: false,
      encryptAtRest: false,
    },
    {
      field: 'install_log',
      classification: 'internal',
      maskInLogs: true,
      encryptAtRest: false,
    },
  ],

  lifecycleRules: {
    requiredModules: [],
    optionalEnhancements: ['compliance', 'policy', 'risk'],
  },
};

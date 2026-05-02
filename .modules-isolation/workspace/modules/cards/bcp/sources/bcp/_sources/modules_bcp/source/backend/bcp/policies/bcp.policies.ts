import { ModulePolicy } from '@dos/types';

/**
 * BCP (Business Continuity Planning) Module Policy
 *
 * Governs business continuity plans, disaster recovery tests, business
 * impact analyses, and recovery time objectives. 10-year retention
 * preserves historical BCP versions and DR test results for regulatory
 * review and continuous improvement.
 */
export const BCP_POLICY: ModulePolicy = {
  moduleCode: 'bcp',

  dataRetention: {
    retentionDays: 3650, // 10 years — BCP version history + DR results
    archiveAfterDays: 2555, // Archive after 7 years
    purgeStrategy: 'archive',
    piiFields: ['plan_owner_name', 'plan_owner_email'],
    legalHoldSupported: true,
    legalHoldField: 'legal_hold',
  },

  accessScope: {
    defaultVisibility: 'org',
    rowLevelSecurity: true,
    fieldLevelRestrictions: [
      {
        field: 'recovery_procedures',
        visibleToRoles: ['owner', 'admin', 'bcp_coordinator', 'risk_manager'],
      },
    ],
  },

  automationGuardrails: {
    autoApprovable: ['bcp.plan.create', 'dr_test.exercise.schedule'],
    requireHumanApproval: ['bcp.plan.activate', 'bcp.plan.approve'],
    maxAutoActionsPerHour: 20,
  },

  aiGuardrails: {
    allowedAiActions: ['bcp.plan.draft', 'bcp.plan.recommend', 'dr_test.exercise.schedule'],
    blockedAiActions: ['bcp.plan.activate', 'bcp.plan.approve', 'bcp.plan.delete'],
    requireHumanReview: ['bcp.plan.activate', 'bcp.plan.approve'],
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
    exportApproverRole: 'bcp_coordinator',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['bcp.plan.activate', 'bcp.plan.approve'],
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
      field: 'recovery_procedures',
      classification: 'confidential',
      maskInLogs: true,
      encryptAtRest: true,
    },
    {
      field: 'critical_systems_list',
      classification: 'confidential',
      maskInLogs: true,
      encryptAtRest: false,
    },
  ],

  lifecycleRules: {
    requiredModules: ['risk'],
    optionalEnhancements: ['incident'],
  },
};

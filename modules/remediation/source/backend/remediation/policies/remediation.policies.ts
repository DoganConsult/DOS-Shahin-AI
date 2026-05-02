import { ModulePolicy } from '@dos/types';

/**
 * Remediation Module Policy
 *
 * Governs remediation plans, corrective actions, and verification of
 * fixes arising from audit findings, risk assessments, or compliance
 * gaps. 5-year retention covers typical audit follow-up cycles.
 */
export const REMEDIATION_POLICY: ModulePolicy = {
  moduleCode: 'remediation',

  dataRetention: {
    retentionDays: 1825, // 5 years — audit follow-up cycle
    archiveAfterDays: 1095, // Archive after 3 years
    purgeStrategy: 'archive',
    piiFields: ['assignee_name', 'verifier_name'],
    legalHoldSupported: true,
    legalHoldField: 'legal_hold',
  },

  accessScope: {
    defaultVisibility: 'team',
    rowLevelSecurity: true,
    fieldLevelRestrictions: [
      {
        field: 'root_cause_analysis',
        visibleToRoles: ['owner', 'admin', 'auditor', 'risk_manager'],
      },
    ],
  },

  automationGuardrails: {
    autoApprovable: ['remediation.plan.create', 'remediation.plan.assign'],
    requireHumanApproval: ['remediation.plan.close', 'remediation.plan.verify'],
    maxAutoActionsPerHour: 40,
  },
  aiGuardrails: {
    allowedAiActions: ['remediation.plan.draft', 'remediation.plan.recommend', 'remediation.plan.summarize'],
    blockedAiActions: ['remediation.plan.delete', 'remediation.plan.approve'],
    requireHumanReview: ['remediation.plan.approve'],
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
    exportApproverRole: 'remediation_manager',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['remediation.plan.approve', 'remediation.plan.close'],
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
      field: 'root_cause_analysis',
      classification: 'confidential',
      maskInLogs: true,
      encryptAtRest: false,
    },
    {
      field: 'remediation_steps',
      classification: 'internal',
      maskInLogs: false,
      encryptAtRest: false,
    },
  ],

  lifecycleRules: {
    requiredModules: ['audit'],
    optionalEnhancements: ['risk', 'workflow'],
  },
};

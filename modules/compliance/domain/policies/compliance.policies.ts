import { ModulePolicy } from '@dos/types';

/**
 * Compliance Module Policy
 *
 * Governs regulatory frameworks, control assessments, and compliance
 * posture tracking. 10-year retention supports long-running regulatory
 * examination cycles and cross-border audit requirements.
 */
export const COMPLIANCE_POLICY: ModulePolicy = {
  moduleCode: 'compliance',

  dataRetention: {
    retentionDays: 3650, // 10 years — regulatory examination lifecycle
    archiveAfterDays: 2555, // Archive after 7 years
    purgeStrategy: 'archive',
    piiFields: ['assessor_name', 'assessor_email'],
    legalHoldSupported: true,
    legalHoldField: 'legal_hold',
  },

  accessScope: {
    defaultVisibility: 'department',
    rowLevelSecurity: true,
    fieldLevelRestrictions: [
      {
        field: 'gap_analysis_notes',
        visibleToRoles: ['owner', 'admin', 'compliance_officer'],
      },
    ],
  },

  automationGuardrails: {
    autoApprovable: ['assessment.record.start'],
    requireHumanApproval: ['framework.record.delete', 'control.record.approve'],
    maxAutoActionsPerHour: 40,
  },

  aiGuardrails: {
    allowedAiActions: ['assessment.record.draft', 'control.record.recommend', 'gap.record.analyze'],
    blockedAiActions: ['framework.record.delete', 'control.record.approve'],
    requireHumanReview: ['control.record.approve', 'assessment.record.complete'],
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
    requiredForStatusChanges: ['control.record.approve', 'assessment.record.complete'],
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
      field: 'gap_analysis_notes',
      classification: 'confidential',
      maskInLogs: true,
      encryptAtRest: false,
    },
    {
      field: 'compliance_score',
      classification: 'internal',
      maskInLogs: false,
      encryptAtRest: false,
    },
  ],

  lifecycleRules: {
    requiredModules: ['risk'],
    optionalEnhancements: ['audit', 'evidence', 'policy'],
  },
};

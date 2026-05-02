import { ModulePolicy } from '@dos/types';

/**
 * Audit Module Policy
 *
 * Governs internal and external audit engagements, findings, and
 * remediation tracking. 20-year retention reflects the most stringent
 * regulatory requirements (e.g., banking supervisory records,
 * government audit mandates).
 */
export const AUDIT_POLICY: ModulePolicy = {
  moduleCode: 'audit',

  dataRetention: {
    retentionDays: 7300, // 20 years — strictest regulatory mandate
    archiveAfterDays: 3650, // Archive after 10 years
    purgeStrategy: 'archive',
    piiFields: ['lead_auditor_name', 'lead_auditor_email'],
    legalHoldSupported: true,
    legalHoldField: 'legal_hold',
  },

  accessScope: {
    defaultVisibility: 'global',
    rowLevelSecurity: true,
    fieldLevelRestrictions: [
      {
        field: 'audit_working_papers',
        visibleToRoles: ['owner', 'admin', 'auditor'],
      },
      {
        field: 'finding_details',
        visibleToRoles: ['owner', 'admin', 'auditor', 'compliance_officer'],
      },
    ],
  },

  automationGuardrails: {
    autoApprovable: [],
    requireHumanApproval: ['audit.record.create', 'audit.record.approve', 'audit.record.close', 'finding.record.create'],
    maxAutoActionsPerHour: 0, // All actions require human approval
  },

  aiGuardrails: {
    allowedAiActions: ['finding.record.draft', 'audit.record.recommend', 'finding.record.classify'],
    blockedAiActions: ['audit.record.create', 'audit.record.approve', 'audit.record.close', 'finding.record.create'],
    requireHumanReview: ['audit.record.create', 'audit.record.approve', 'audit.record.close', 'finding.record.create'],
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
    exportApproverRole: 'auditor',
    importAllowed: false,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['audit.record.approve', 'audit.record.close', 'finding.record.create'],
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
      field: 'audit_working_papers',
      classification: 'restricted',
      maskInLogs: true,
      encryptAtRest: true,
    },
    {
      field: 'finding_details',
      classification: 'confidential',
      maskInLogs: true,
      encryptAtRest: true,
    },
  ],

  lifecycleRules: {
    requiredModules: ['compliance', 'evidence'],
    optionalEnhancements: ['risk', 'governance'],
  },
};

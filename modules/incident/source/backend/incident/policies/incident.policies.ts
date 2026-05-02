import { ModulePolicy } from '@dos/types';

/**
 * Incident Module Policy
 *
 * Governs security and operational incident management including
 * detection, triage, response, and post-incident review. 7-year
 * retention covers regulatory reporting windows and supports
 * trend analysis for recurring incident patterns.
 */
export const INCIDENT_POLICY: ModulePolicy = {
  moduleCode: 'incident',

  dataRetention: {
    retentionDays: 2555, // 7 years — regulatory reporting window
    archiveAfterDays: 1825, // Archive after 5 years
    purgeStrategy: 'archive',
    piiFields: ['reporter_name', 'reporter_email'],
    legalHoldSupported: true,
    legalHoldField: 'legal_hold',
  },

  accessScope: {
    defaultVisibility: 'department',
    rowLevelSecurity: true,
    fieldLevelRestrictions: [
      {
        field: 'incident_root_cause',
        visibleToRoles: ['owner', 'admin', 'risk_manager', 'incident_manager'],
      },
    ],
  },

  automationGuardrails: {
    autoApprovable: ['incident.record.create', 'incident.record.assign'],
    requireHumanApproval: ['incident.record.close', 'incident.record.escalate'],
    maxAutoActionsPerHour: 100,
  },

  aiGuardrails: {
    allowedAiActions: ['incident.record.draft', 'incident.record.classify', 'incident.record.recommend'],
    blockedAiActions: ['incident.record.close', 'incident.record.escalate', 'incident.record.delete'],
    requireHumanReview: ['incident.record.close', 'incident.record.escalate'],
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
    exportApproverRole: 'incident_manager',
    importAllowed: true,
    importValidationRequired: true,
    externalSharingAllowed: false,
    externalSharingRoles: [],
  },

  evidenceRequirements: {
    requiredForStatusChanges: ['incident.record.close', 'incident.record.escalate'],
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
      field: 'reporter_name',
      classification: 'restricted',
      maskInLogs: true,
      encryptAtRest: true,
    },
    {
      field: 'reporter_email',
      classification: 'restricted',
      maskInLogs: true,
      encryptAtRest: true,
    },
    {
      field: 'incident_description',
      classification: 'confidential',
      maskInLogs: true,
      encryptAtRest: false,
    },
  ],

  lifecycleRules: {
    requiredModules: ['risk'],
    optionalEnhancements: ['workflow', 'notification', 'remediation'],
  },
};

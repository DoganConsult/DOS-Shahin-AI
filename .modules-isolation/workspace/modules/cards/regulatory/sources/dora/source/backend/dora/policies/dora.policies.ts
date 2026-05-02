import { ModulePolicy } from '@dos/types';

export const DORA_POLICY: ModulePolicy = {
  moduleCode: 'dora',
  dataRetention: { retentionDays: 3650, archiveAfterDays: 2555, purgeStrategy: 'soft_delete', piiFields: [], legalHoldSupported: true, legalHoldField: 'legal_hold' },
  accessScope: { defaultVisibility: 'org', rowLevelSecurity: true, fieldLevelRestrictions: [] },
  automationGuardrails: { autoApprovable: ['dora.resilience_test.schedule', 'dora.threat_intel.acknowledge'], requireHumanApproval: ['dora.major_incident.report', 'dora.resilience_test.certify', 'dora.third_party.flag'], maxAutoActionsPerHour: 50 },
  aiGuardrails: { allowedAiActions: ['dora.gap.narrate', 'dora.evidence.sufficiency', 'dora.regulatory.summarize'], blockedAiActions: ['dora.major_incident.report', 'dora.resilience_test.certify'], requireHumanReview: ['dora.regulatory.summarize'], maxAiActionsPerHour: 50, promptInjectionProtection: true, outputValidation: true },
  dataResidency: { allowedRegions: ['sa-riyadh', 'eu-central'], defaultRegion: 'sa-riyadh', crossBorderTransferAllowed: true, crossBorderApprovalRequired: true },
  exportImport: { exportAllowed: true, exportFormats: ['csv', 'xlsx', 'pdf', 'json'], exportRequiresApproval: true, exportApproverRole: 'dora_manager', importAllowed: true, importValidationRequired: true, externalSharingAllowed: false, externalSharingRoles: [] },
  evidenceRequirements: { requiredForStatusChanges: ['dora.resilience_test.certify', 'dora.major_incident.close'], requiredForApprovals: true, minimumEvidenceCount: 1, allowedEvidenceTypes: ['document', 'screenshot', 'link', 'attestation', 'system_generated'] },
  auditLogging: { logAllReads: true, logAllWrites: true, logFieldChanges: true, sensitiveFieldsRedacted: true, retentionDays: 3650 },
  fieldSensitivity: [],
  lifecycleRules: { requiredModules: ['risk', 'asset'], optionalEnhancements: ['incident', 'vendor', 'bcp', 'compliance', 'workflow', 'notification'] },
};

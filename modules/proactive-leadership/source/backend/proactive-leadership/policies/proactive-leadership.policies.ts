import { ModulePolicy } from '@dos/types';

export const PROACTIVE_LEADERSHIP_POLICY: ModulePolicy = {
  moduleCode: 'proactive-leadership',
  dataRetention: { retentionDays: 1825, archiveAfterDays: 730, purgeStrategy: 'soft_delete', piiFields: [], legalHoldSupported: true, legalHoldField: 'legal_hold' },
  accessScope: { defaultVisibility: 'org', rowLevelSecurity: true, fieldLevelRestrictions: [] },
  automationGuardrails: { autoApprovable: ['proactive-leadership.insight.generate'], requireHumanApproval: ['proactive-leadership.brief.distribute'], maxAutoActionsPerHour: 50 },
  aiGuardrails: { allowedAiActions: ['proactive-leadership.insight.generate', 'proactive-leadership.brief.summarize', 'proactive-leadership.anomaly.detect'], blockedAiActions: ['proactive-leadership.alert.acknowledge'], requireHumanReview: [], maxAiActionsPerHour: 100, promptInjectionProtection: true, outputValidation: true },
  dataResidency: { allowedRegions: ['sa-riyadh', 'me-central'], defaultRegion: 'sa-riyadh', crossBorderTransferAllowed: false, crossBorderApprovalRequired: true },
  exportImport: { exportAllowed: true, exportFormats: ['pdf', 'json'], exportRequiresApproval: true, exportApproverRole: 'executive_owner', importAllowed: false, importValidationRequired: false, externalSharingAllowed: false, externalSharingRoles: [] },
  evidenceRequirements: { requiredForStatusChanges: [], requiredForApprovals: false, minimumEvidenceCount: 0, allowedEvidenceTypes: [] },
  auditLogging: { logAllReads: true, logAllWrites: true, logFieldChanges: true, sensitiveFieldsRedacted: true, retentionDays: 1825 },
  fieldSensitivity: [],
  lifecycleRules: { requiredModules: [], optionalEnhancements: ['risk', 'compliance', 'governance', 'ai'] },
};

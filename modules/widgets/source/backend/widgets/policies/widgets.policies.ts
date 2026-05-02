import { ModulePolicy } from '@dos/types';

export const WIDGETS_POLICY: ModulePolicy = {
  moduleCode: 'widgets',
  dataRetention: { retentionDays: 1095, archiveAfterDays: 730, purgeStrategy: 'soft_delete', piiFields: [], legalHoldSupported: false, legalHoldField: '' },
  accessScope: { defaultVisibility: 'org', rowLevelSecurity: true, fieldLevelRestrictions: [] },
  automationGuardrails: { autoApprovable: ['widgets.render', 'widgets.data.refresh'], requireHumanApproval: ['widgets.registry.publish', 'widgets.bundle.publish'], maxAutoActionsPerHour: 1000 },
  aiGuardrails: { allowedAiActions: ['widgets.recommend', 'widgets.anomaly.detect', 'widgets.trend.narrate'], blockedAiActions: ['widgets.registry.delete'], requireHumanReview: [], maxAiActionsPerHour: 200, promptInjectionProtection: true, outputValidation: true },
  dataResidency: { allowedRegions: ['sa-riyadh', 'me-central'], defaultRegion: 'sa-riyadh', crossBorderTransferAllowed: false, crossBorderApprovalRequired: false },
  exportImport: { exportAllowed: true, exportFormats: ['json', 'png', 'pdf'], exportRequiresApproval: false, exportApproverRole: '', importAllowed: true, importValidationRequired: true, externalSharingAllowed: false, externalSharingRoles: [] },
  evidenceRequirements: { requiredForStatusChanges: [], requiredForApprovals: false, minimumEvidenceCount: 0, allowedEvidenceTypes: [] },
  auditLogging: { logAllReads: false, logAllWrites: true, logFieldChanges: true, sensitiveFieldsRedacted: false, retentionDays: 730 },
  fieldSensitivity: [],
  lifecycleRules: { requiredModules: [], optionalEnhancements: ['dashboard', 'analytics', 'ai'] },
};

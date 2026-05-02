export const AGRC_ENGINE_POLICY = {
    moduleCode: 'agrc-engine',
    dataRetention: { retentionDays: 1095, archiveAfterDays: 730, purgeStrategy: 'soft_delete', piiFields: [], legalHoldSupported: true, legalHoldField: 'legal_hold' },
    accessScope: { defaultVisibility: 'org', rowLevelSecurity: true, fieldLevelRestrictions: [] },
    automationGuardrails: { autoApprovable: ['agrc-engine.run.start', 'agrc-engine.telemetry.collect'], requireHumanApproval: ['agrc-engine.config.change'], maxAutoActionsPerHour: 500 },
    aiGuardrails: { allowedAiActions: ['agrc-engine.anomaly.detect', 'agrc-engine.health.analyze'], blockedAiActions: ['agrc-engine.config.change'], requireHumanReview: [], maxAiActionsPerHour: 200, promptInjectionProtection: true, outputValidation: true },
    dataResidency: { allowedRegions: ['sa-riyadh', 'me-central'], defaultRegion: 'sa-riyadh', crossBorderTransferAllowed: false, crossBorderApprovalRequired: true },
    exportImport: { exportAllowed: true, exportFormats: ['json'], exportRequiresApproval: false, exportApproverRole: '', importAllowed: false, importValidationRequired: false, externalSharingAllowed: false, externalSharingRoles: [] },
    evidenceRequirements: { requiredForStatusChanges: [], requiredForApprovals: false, minimumEvidenceCount: 0, allowedEvidenceTypes: [] },
    auditLogging: { logAllReads: false, logAllWrites: true, logFieldChanges: true, sensitiveFieldsRedacted: true, retentionDays: 1095 },
    fieldSensitivity: [],
    lifecycleRules: { requiredModules: [], optionalEnhancements: [] },
};
//# sourceMappingURL=agrc-engine.policies.js.map
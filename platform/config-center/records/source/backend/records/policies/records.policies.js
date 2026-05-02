"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RECORDS_POLICY = void 0;
exports.RECORDS_POLICY = {
    moduleCode: 'records',
    dataRetention: {
        retentionDays: 3650,
        archiveAfterDays: 2555,
        purgeStrategy: 'archive',
        piiFields: ['record_owner_name'],
        legalHoldSupported: true,
        legalHoldField: 'legal_hold',
    },
    accessScope: {
        defaultVisibility: 'department',
        rowLevelSecurity: true,
        fieldLevelRestrictions: [
            { field: 'disposal_notes', visibleToRoles: ['owner', 'admin', 'records_manager'] },
        ],
    },
    automationGuardrails: {
        autoApprovable: ['record.entry.classify'],
        requireHumanApproval: ['record.entry.dispose', 'record.entry.hold_release'],
        maxAutoActionsPerHour: 40,
    },
    aiGuardrails: {
        allowedAiActions: ['records.entry.draft', 'records.entry.recommend', 'records.entry.summarize'],
        blockedAiActions: ['records.record.delete', 'records.record.approve'],
        requireHumanReview: ['records.record.approve'],
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
        exportApproverRole: 'records_manager',
        importAllowed: true,
        importValidationRequired: true,
        externalSharingAllowed: false,
        externalSharingRoles: [],
    },
    evidenceRequirements: {
        requiredForStatusChanges: ['records.record.approve', 'records.entry.close'],
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
            field: 'record_content',
            classification: 'confidential',
            maskInLogs: true,
            encryptAtRest: true,
        },
    ],
    lifecycleRules: {
        requiredModules: [],
        optionalEnhancements: [],
    },
};
//# sourceMappingURL=records.policies.js.map
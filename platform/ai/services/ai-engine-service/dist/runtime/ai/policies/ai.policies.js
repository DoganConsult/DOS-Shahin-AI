/**
 * AI Module Policy
 *
 * Governs AI inference, agent execution, and agent lifecycle
 * management. 7-year retention supports model audit trails
 * and explainability requirements.
 */
export const AI_POLICY = {
    moduleCode: 'ai',
    dataRetention: {
        retentionDays: 2555, // 7 years — model audit trail
        archiveAfterDays: 1825, // Archive after 5 years, retain 2 more
        purgeStrategy: 'archive',
        piiFields: [],
        legalHoldSupported: true,
        legalHoldField: 'legal_hold',
    },
    accessScope: {
        defaultVisibility: 'org',
        rowLevelSecurity: false,
        fieldLevelRestrictions: [],
    },
    automationGuardrails: {
        autoApprovable: ['ai.agent.infer', 'ai.agent.run', 'ai.agent.assign'],
        requireHumanApproval: ['ai.agent.deploy', 'ai.agent.deactivate'],
        maxAutoActionsPerHour: 500,
    },
    aiGuardrails: {
        allowedAiActions: ['ai.agent.draft', 'ai.agent.recommend', 'ai.agent.summarize'],
        blockedAiActions: ['ai.agent.delete', 'ai.agent.approve'],
        requireHumanReview: ['ai.agent.approve'],
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
        exportApproverRole: 'ai_manager',
        importAllowed: true,
        importValidationRequired: true,
        externalSharingAllowed: false,
        externalSharingRoles: [],
    },
    evidenceRequirements: {
        requiredForStatusChanges: ['ai.agent.approve', 'ai.agent.close'],
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
            field: 'prompt_content',
            classification: 'internal',
            maskInLogs: false,
            encryptAtRest: false,
        },
        {
            field: 'model_output',
            classification: 'internal',
            maskInLogs: false,
            encryptAtRest: false,
        },
    ],
    lifecycleRules: {
        requiredModules: [],
        optionalEnhancements: ['ai-governance'],
    },
};
//# sourceMappingURL=ai.policies.js.map
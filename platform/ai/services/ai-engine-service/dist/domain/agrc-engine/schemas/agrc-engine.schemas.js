/**
 * AGRC Engine Validation Schemas — Zod v4 Enterprise Grade
 * Uses advanced features from common.schemas.
 *
 * @owner agrc-engine
 * @module agrc-engine
 * @since 2026-03-31
 */
import { z } from 'zod';
import { grcJsonMetadata, } from '../../../schemas/common.schemas';
// ── Domain Enums ─────────────────────────────────────────────────────
const runType = z.enum([
    'ccm_scan', 'telemetry_collection', 'automation_cycle',
    'health_check', 'full_orchestration',
]);
const runStatus = z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']);
// ── Body Schemas ─────────────────────────────────────────────────────
export const startRunBody = z.object({
    runType: runType,
    config: grcJsonMetadata.optional(),
});
export const updateConfigBody = z.object({
    automationEnabled: z.boolean().optional(),
    ccmScanInterval: z.coerce.number().int().min(60).max(86400).optional(),
    telemetryInterval: z.coerce.number().int().min(60).max(86400).optional(),
    maxConcurrentRuns: z.coerce.number().int().min(1).max(10).optional(),
}).refine((data) => Object.values(data).some((v) => v !== undefined), { message: 'At least one config field must be provided' });
// ── Query Schemas ────────────────────────────────────────────────────
export const listRunsQuery = z.object({
    status: runStatus.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
});
// ── Auto-generated validation schemas (enterprise hardening) ──
export const createSnapshotBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createRunBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const updateCustomBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
// ── Gates Schemas ──────────────────────────────────────────────────
export const createRegistryBody = z.object({
    gate_code: z.string().min(1).max(100),
    gate_type: z.enum(['release', 'vendor', 'compliance', 'custom']).default('custom'),
    display_name_en: z.string().min(1).max(500),
    display_name_ar: z.string().max(500).optional(),
    description_en: z.string().max(5000).optional(),
    validation_rules: z.array(z.record(z.string(), z.unknown())).optional(),
    ai_analysis_enabled: z.boolean().optional(),
    ai_prompt_template: z.string().max(10000).optional(),
    required_permission: z.string().max(100).optional(),
    severity_on_block: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    override_allowed: z.boolean().optional(),
    sla_hours: z.coerce.number().int().min(1).max(720).optional(),
});
export const updateRegistryBody = z.object({
    display_name_en: z.string().min(1).max(500).optional(),
    display_name_ar: z.string().max(500).optional(),
    description_en: z.string().max(5000).optional(),
    enabled: z.boolean().optional(),
    ai_analysis_enabled: z.boolean().optional(),
    ai_prompt_template: z.string().max(10000).optional(),
    severity_on_block: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    override_allowed: z.boolean().optional(),
    override_requires_approval: z.boolean().optional(),
    sla_hours: z.coerce.number().int().min(1).max(720).optional(),
    auto_notify_on_block: z.boolean().optional(),
    notification_channels: z.array(z.string().max(200)).optional(),
});
export const createRulesBody = z.object({
    rule_name: z.string().min(1).max(255),
    rule_type: z.string().min(1).max(100),
    rule_config: z.record(z.string(), z.unknown()),
    error_message_en: z.string().max(2000).optional(),
    error_message_ar: z.string().max(2000).optional(),
    severity: z.enum(['info', 'warning', 'blocker']).optional(),
    execution_order: z.coerce.number().int().min(0).optional(),
});
/** Dynamic gate params — passed through to validateDynamicGate */
export const createValidateBody = z.record(z.string(), z.unknown());
export const createValidateBatchBody = z.object({
    gates: z.array(z.object({
        gateCode: z.string().min(1).max(100),
        params: z.record(z.string(), z.unknown()).optional(),
    })).min(1).max(50),
});
export const createOverrideBody = z.object({
    justification: z.string().min(1).max(5000),
});
export const createApproveBody = z.object({
    approved: z.boolean(),
    comment: z.string().max(5000).optional(),
});
// ── Integration Schemas ───────────────────────────────────────────
export const createSeedTargetsBody = z.object({
    force: z.boolean().optional(),
    scope: z.enum(['all', 'framework_focus', 'risk_area']).optional(),
});
export const updateReviewBody = z.object({
    decision: z.enum(['approved', 'rejected', 'deferred']),
    comment: z.string().max(5000).optional(),
    nextReviewDate: z.string().datetime({ offset: true }).optional(),
});
// ── Agent Orchestration Schemas ───────────────────────────────────
export const createAskBody = z.object({
    question: z.string().min(1).max(10000),
    mode: z.enum(['manager', 'analyst', 'observer']).optional(),
});
export const createRejectBody = z.object({
    comment: z.string().max(5000).optional(),
    reason: z.string().max(2000).optional(),
});
export const updateShadowAgentsBody = z.object({
    enabled: z.boolean().optional(),
    agentId: z.string().max(100).optional(),
    scope: z.array(z.string().max(200)).optional(),
    autonomyLevel: z.enum(['advisory', 'semi_autonomous', 'fully_autonomous']).optional(),
    constraints: z.record(z.string(), z.unknown()).optional(),
});
export const createCheckBody = z.object({
    agentId: z.string().min(1).max(100),
    actionType: z.string().min(1).max(200),
    userPermissions: z.array(z.string().max(200)).optional(),
    autonomyLevel: z.enum(['advisory', 'semi_autonomous', 'fully_autonomous']).optional(),
});
// ── Agent Memory Schemas ──────────────────────────────────────────
export const createRetrieveBody = z.object({
    query: z.string().min(1).max(10000),
    types: z.array(z.string().max(100)).optional(),
    agentId: z.string().max(100).optional(),
    userId: z.string().max(100).optional(),
    topK: z.coerce.number().int().min(1).max(100).optional(),
});
export const createCommitBody = z.object({
    facts: z.array(z.object({
        content: z.string().min(1).max(10000),
        memoryType: z.string().max(100).optional(),
        importanceScore: z.coerce.number().min(0).max(1).optional(),
    })).min(1).max(100),
    summary: z.string().max(5000).optional(),
    agentId: z.string().max(100).optional(),
    userId: z.string().max(100).optional(),
    runId: z.string().max(100).optional(),
});
export const createStoreBody = z.object({
    content: z.string().min(1).max(50000),
    memoryType: z.enum(['task', 'conversation', 'fact', 'preference', 'procedure']).optional(),
    agentId: z.string().max(100).optional(),
    userId: z.string().max(100).optional(),
    summary: z.string().max(5000).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    importanceScore: z.coerce.number().min(0).max(1).optional(),
    expiresInDays: z.coerce.number().int().min(1).max(3650).optional(),
});
// ── Delegation & Consent Schemas ──────────────────────────────────
export const updateDelegationRulesBody = z.object({
    agentId: z.string().min(1).max(100),
    actionTypes: z.array(z.string().max(200)).optional(),
    scope: z.record(z.string(), z.unknown()).optional(),
    enabled: z.boolean().optional(),
    constraints: z.record(z.string(), z.unknown()).optional(),
    expiresAt: z.string().datetime({ offset: true }).optional(),
});
export const createGrantBody = z.object({
    purpose: z.string().max(2000).optional(),
    scope: z.array(z.string().max(200)).optional(),
    expiresAt: z.string().datetime({ offset: true }).optional(),
});
export const createRevokeBody = z.object({
    reason: z.string().max(2000).optional(),
});
export const createForgetBody = z.object({
    scope: z.enum(['all', 'memories', 'preferences', 'conversations']).optional(),
    reason: z.string().max(2000).optional(),
});
// ── CCM / Orchestration Schemas ─────────────────────────────────────
export const createScanBody = z.object({
    scanType: z.enum(['ccm', 'regulatory', 'compliance', 'full']).default('full'),
    scope: z.record(z.string(), z.unknown()).optional(),
    dryRun: z.boolean().optional(),
});
export const createOrchestrateBody = z.object({
    orchestrationType: z.enum(['full', 'ccm_only', 'regulatory_only', 'remediation']).default('full'),
    targetFrameworks: z.array(z.string().max(100)).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    dryRun: z.boolean().optional(),
});
export const createEscalateBody = z.object({
    entityType: z.string().min(1).max(100),
    entityId: z.string().min(1).max(255),
    escalationLevel: z.enum(['team_lead', 'department_head', 'executive', 'board']),
    reason: z.string().min(1).max(2000),
    notifyRoles: z.array(z.string().max(100)).optional(),
});
// ── Constitution Schemas ────────────────────────────────────────────
export const createRiskAppetiteBody = z.object({
    category: z.string().min(1).max(200),
    maxResidualScore: z.coerce.number().int().min(0).max(100),
    acceptanceRequiresRole: z.string().min(1).max(100),
    reviewCadenceDays: z.coerce.number().int().min(1).max(365),
    description: z.string().max(2000).optional(),
}).or(z.array(z.object({
    category: z.string().min(1).max(200),
    maxResidualScore: z.coerce.number().int().min(0).max(100),
    acceptanceRequiresRole: z.string().min(1).max(100),
    reviewCadenceDays: z.coerce.number().int().min(1).max(365),
    description: z.string().max(2000).optional(),
})).min(1).max(50));
export const createAuthorityMatrixBody = z.object({
    decisionType: z.string().min(1).max(200),
    criticality: z.enum(['low', 'medium', 'high', 'critical']),
    approverRole: z.string().min(1).max(100),
    escalationPath: z.array(z.string().max(100)).optional(),
    conditions: z.record(z.string(), z.unknown()).optional(),
}).or(z.array(z.object({
    decisionType: z.string().min(1).max(200),
    criticality: z.enum(['low', 'medium', 'high', 'critical']),
    approverRole: z.string().min(1).max(100),
    escalationPath: z.array(z.string().max(100)).optional(),
    conditions: z.record(z.string(), z.unknown()).optional(),
})).min(1).max(100));
export const createEscalationThresholdsBody = z.object({
    thresholdType: z.string().min(1).max(200),
    triggerValue: z.coerce.number().min(0),
    escalationLevel: z.enum(['team_lead', 'department_head', 'executive', 'board']),
    notifyRoles: z.array(z.string().max(100)).optional(),
    autoEscalateAfterHours: z.coerce.number().int().min(0).max(720).optional(),
}).or(z.array(z.object({
    thresholdType: z.string().min(1).max(200),
    triggerValue: z.coerce.number().min(0),
    escalationLevel: z.enum(['team_lead', 'department_head', 'executive', 'board']),
    notifyRoles: z.array(z.string().max(100)).optional(),
    autoEscalateAfterHours: z.coerce.number().int().min(0).max(720).optional(),
})).min(1).max(50));
export const createResolveApproverBody = z.object({
    decisionType: z.string().min(1).max(200),
    criticality: z.enum(['low', 'medium', 'high', 'critical']),
});
// ── Telemetry Schemas ──────────────────────────────────────────────
const telemetrySignal = z.object({
    signalType: z.string().min(1).max(100),
    subjectKey: z.string().min(1).max(255),
    value: z.coerce.number(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    timestamp: z.string().datetime({ offset: true }).optional(),
});
export const createIngestBody = telemetrySignal;
export const createIngestBatchBody = z.object({
    signals: z.array(telemetrySignal).min(1).max(1000),
});
export const createTelemetryBody = z.object({
    signalType: z.string().min(1).max(100),
    subjectKey: z.string().min(1).max(255),
    value: z.coerce.number(),
    source: z.string().max(255).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
// ── Webhook Schemas ────────────────────────────────────────────────
export const createExternalBody = z.object({
    eventType: z.string().min(1).max(100),
    payload: z.record(z.string(), z.unknown()),
    source: z.string().max(255).optional(),
    timestamp: z.string().datetime({ offset: true }).optional(),
});
export const createKeysBody = z.object({
    keyName: z.string().min(1).max(255),
    sourceName: z.string().min(1).max(255),
    enableHmac: z.boolean().optional(),
});
// ── SOP & Runbook Schemas ──────────────────────────────────────────
export const createSopsBody = z.object({
    processType: z.string().min(1).max(100),
    title: z.string().min(1).max(500),
    titleAr: z.string().max(500).optional(),
    description: z.string().max(5000).optional(),
    steps: z.array(z.object({
        order: z.coerce.number().int().min(0),
        instruction: z.string().min(1).max(2000),
        responsibleRole: z.string().max(100).optional(),
        evidenceRequired: z.boolean().optional(),
    })).min(1).max(100),
    stageId: z.string().max(100).optional(),
    roleId: z.string().max(100).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createRunbooksBody = z.object({
    triggerEvent: z.string().min(1).max(100),
    title: z.string().min(1).max(500),
    description: z.string().max(5000).optional(),
    steps: z.array(z.object({
        order: z.coerce.number().int().min(0),
        action: z.string().min(1).max(2000),
        automated: z.boolean().optional(),
        timeoutMinutes: z.coerce.number().int().min(0).max(1440).optional(),
    })).min(1).max(100),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createSeedBody = z.object({
    force: z.boolean().optional(),
});
export const createStartBody = z.object({
    totalSteps: z.coerce.number().int().min(1).max(1000),
    notes: z.string().max(2000).optional(),
});
export const updateCompletionsBody = z.object({
    completedSteps: z.array(z.coerce.number().int().min(0)).min(1).max(1000),
    notes: z.string().max(5000).optional(),
});
export const createSetupBody = z.object({
    seedRiskAppetite: z.boolean().optional(),
    seedRunbooks: z.boolean().optional(),
    seedSOPs: z.boolean().optional(),
    seedDemoData: z.boolean().optional(),
});
//# sourceMappingURL=agrc-engine.schemas.js.map
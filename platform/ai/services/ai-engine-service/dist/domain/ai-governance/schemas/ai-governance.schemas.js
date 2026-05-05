/**
 * Zod validation schemas for AI Governance module.
 * Used with validate() middleware in ai-governance route files.
 */
import { z } from 'zod';
import { paginationQuery, statusFilter } from '../../../schemas/common.schemas';
// -- Model Registration -------------------------------------------------------
export const createModelRegistrationBody = z.object({
    model_name: z.string().min(1).max(255),
    model_type: z.string().min(1).max(100),
    risk_classification: z.enum(['low', 'medium', 'high', 'critical']),
    owner: z.string().uuid(),
    description: z.string().optional(),
    version: z.string().max(50).optional(),
    status: z.enum(['draft', 'under_review', 'approved', 'retired']).default('draft'),
});
export const updateModelBody = createModelRegistrationBody.partial();
export const listModelsQuery = paginationQuery.merge(statusFilter).extend({
    risk_classification: z.string().optional(),
    owner: z.string().optional(),
    model_type: z.string().optional(),
});
// -- AI Policy ----------------------------------------------------------------
export const createAIPolicyBody = z.object({
    title: z.string().min(1).max(255),
    scope: z.string().min(1).max(500),
    enforcement_level: z.enum(['advisory', 'mandatory', 'blocking']),
    description: z.string().optional(),
    effective_date: z.string().datetime({ offset: true }).optional(),
    status: z.enum(['draft', 'active', 'archived']).default('draft'),
});
export const updateAIPolicyBody = createAIPolicyBody.partial();
export const listAIPoliciesQuery = paginationQuery.merge(statusFilter).extend({
    enforcement_level: z.string().optional(),
});
// ── Response Schemas ──────────────────────────────────────────
export const ai_governanceResponseSchema = z.object({
    id: z.string(),
    tenant_id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    created_by: z.string(),
    updated_by: z.string().optional(),
});
export const ai_governanceListResponseSchema = z.object({
    data: z.array(ai_governanceResponseSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
});
// ── Event Payload Schema ─────────────────────────────────────
export const ai_governanceEventPayloadSchema = z.object({
    tenantId: z.string(),
    entityType: z.string(),
    entityId: z.string(),
    moduleCode: z.literal('ai-governance'),
    triggeredBy: z.string(),
    timestamp: z.string(),
    correlationId: z.string(),
    eventVersion: z.number().int().min(1),
    previousState: z.string().optional(),
    newState: z.string().optional(),
    data: z.record(z.string(), z.unknown()),
});
// ── Status Transition Schema ─────────────────────────────────
export const ai_governanceStatusTransitionSchema = z.object({
    entityId: z.string(),
    fromStatus: z.string(),
    toStatus: z.string(),
    reason: z.string().optional(),
    comments: z.string().max(5000).optional(),
    evidenceIds: z.array(z.string()).optional(),
});
// ── Import/Export Schemas ─────────────────────────────────────
export const ai_governanceImportRowSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    status: z.string().optional(),
    external_id: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const ai_governanceImportBatchSchema = z.object({
    rows: z.array(ai_governanceImportRowSchema).min(1).max(5000),
    options: z.object({
        skipDuplicates: z.boolean().default(true),
        validateOnly: z.boolean().default(false),
        overwriteExisting: z.boolean().default(false),
    }).optional(),
});
export const ai_governanceExportRequestSchema = z.object({
    format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
    filters: z.record(z.string(), z.string()).optional(),
    columns: z.array(z.string()).optional(),
    includeArchived: z.boolean().default(false),
});
// ── Admin Schemas ────────────────────────────────────────────
export const ai_governanceAdminConfigSchema = z.object({
    moduleCode: z.literal('ai-governance'),
    autoArchiveEnabled: z.boolean().default(true),
    autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
    defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
    notificationsEnabled: z.boolean().default(true),
    aiAssistEnabled: z.boolean().default(true),
    workflowEnabled: z.boolean().default(true),
    maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});
// ── Bulk Operation Schemas ───────────────────────────────────
export const ai_governanceBulkUpdateSchema = z.object({
    ids: z.array(z.string()).min(1).max(100),
    update: z.record(z.string(), z.unknown()),
});
export const ai_governanceBulkStatusChangeSchema = z.object({
    ids: z.array(z.string()).min(1).max(100),
    toStatus: z.string(),
    reason: z.string().optional(),
});
export let rootPostBody = z.object({
    asset_type: z.string(),
    asset_key: z.string(),
    display_name: z.string(),
    description: z.string().optional(),
    scope_type: z.string().optional(),
    lifecycle_status: z.string().optional(),
    status: z.string().optional(),
    business_owner: z.string().optional(),
    technical_owner: z.string().optional(),
    governance_owner: z.string().optional(),
    source_type: z.string().optional(),
    source_ref: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    tags: z.array(z.unknown()).optional(),
});
export let idPatchBody = z.object({
    lifecycle_status: z.string().optional(),
});
export let idTransitionPostBody = z.object({
    target_status: z.string(),
});
export let discoverPostBody = z.object({});
export let agentToolsPostBody = z.object({
    agent_asset_id: z.string(),
    tool_asset_id: z.string(),
    is_enabled: z.boolean().optional(),
    notes: z.string().optional(),
});
export let agentToolsBindingIdPatchBody = z.object({
    is_enabled: z.boolean().optional(),
    notes: z.string().optional(),
});
export let agentToolsBindingIdEnablePostBody = z.object({});
export let agentToolsBindingIdDisablePostBody = z.object({});
export let allowlistPostBody = z.object({
    asset_id: z.string(),
    asset_type: z.string(),
    is_enabled: z.boolean().optional(),
    notes: z.string().optional(),
    max_tokens_limit: z.string().optional(),
    temperature_limit: z.string().optional(),
});
export let allowlistAllowlistIdPatchBody = z.object({
    is_enabled: z.boolean().optional(),
    notes: z.string().optional(),
    max_tokens_limit: z.string().optional(),
    temperature_limit: z.string().optional(),
});
export let allowlistAllowlistIdEnablePostBody = z.object({});
export let allowlistAllowlistIdDisablePostBody = z.object({});
export let allowlistBackfillPostBody = z.object({});
export let enforcementModePutBody = z.object({
    mode: z.string(),
});
export let sodPolicyPutBody = z.object({
    policy: z.string(),
    registry_type: z.string().optional(),
});
export let breakGlassPostBody = z.object({
    asset_id: z.string(),
    registry_type: z.string(),
    reason: z.string(),
    version_id: z.string().optional(),
    duration_minutes: z.string().optional(),
});
export let breakGlassIdRevokePostBody = z.object({});
export let promotionsPostBody = z.object({
    asset_id: z.string(),
    version_id: z.string(),
    registry_type: z.string(),
    from_environment: z.string(),
    to_environment: z.string(),
    notes: z.string().optional(),
});
export let repairPostBody = z.object({});
export let optOutConfigSchema = z.object({
    globalOptOut: z.boolean(),
    optOutModules: z.record(z.string(), z.boolean()),
    dataRetentionDays: z.number().min(7).max(365),
    anonymizePrompts: z.boolean(),
    disableTraining: z.boolean(),
});
export let alertRulesPostBody = z.object({
    rule_name: z.string(),
    description: z.string().optional(),
    trigger_condition: z.string().optional(),
    channels: z.string().optional(),
    escalation_chain: z.string().optional(),
    enabled: z.boolean().optional(),
});
export let alertRulesIdPutBody = z.object({
    rule_name: z.string().optional(),
    description: z.string().optional(),
    trigger_condition: z.string().optional(),
    channels: z.string().optional(),
    escalation_chain: z.string().optional(),
    enabled: z.boolean().optional(),
    snooze_until: z.string().optional(),
});
export let alertHistoryIdAcknowledgePostBody = z.object({});
export let killSwitchesPostBody = z.object({
    asset_name: z.string(),
    asset_type: z.string(),
    asset_id: z.string().optional(),
    kill_switch_type: z.string().optional(),
    trigger_method: z.string().optional(),
    fallback_procedure: z.string().optional(),
});
export let killSwitchesIdTestPostBody = z.object({});
export let killSwitchesIdActivatePostBody = z.object({});
export let modelMetricsPostBody = z.object({
    version_id: z.string(),
    metric_type: z.string(),
    asset_id: z.string().optional(),
    value: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export let driftThresholdsPutBody = z.object({
    asset_id: z.string(),
    metric_type: z.string(),
    warning_delta: z.string().optional(),
    critical_delta: z.string().optional(),
    baseline_value: z.string().optional(),
    enabled: z.boolean().optional(),
});
export let fairnessScanPostBody = z.object({
    model_asset_id: z.string(),
    model_name: z.string().optional(),
});
export let euAiActClassifyPostBody = z.object({
    model_id: z.string(),
    answers: z.array(z.unknown()),
    model_name: z.string().optional(),
});
export let redTeamSchedulesPostBody = z.object({
    name: z.string(),
    model_id: z.string().optional(),
    prompt_template: z.string().optional(),
    frequency: z.string().optional(),
    enabled: z.boolean().optional(),
});
export let redTeamSchedulesIdPutBody = z.object({
    name: z.string().optional(),
    model_id: z.string().optional(),
    prompt_template: z.string().optional(),
    frequency: z.string().optional(),
    enabled: z.boolean().optional(),
});
export let ethicsReviewsPostBody = z.object({
    system_name: z.string(),
    system_type: z.string().optional(),
    description: z.string().optional(),
    risk_category: z.string().optional(),
    assessment_data: z.string().optional(),
});
export let ethicsReviewsIdVotePostBody = z.object({
    vote: z.string(),
    notes: z.string().optional(),
});
export let ethicsReviewsIdDecidePostBody = z.object({
    decision: z.string(),
    conditions: z.string().optional(),
});
export let impactAssessmentsPostBody = z.object({
    system_name: z.string(),
    model_asset_id: z.string().optional(),
    steps_data: z.string().optional(),
});
export let impactAssessmentsIdPutBody = z.object({
    steps_data: z.string().optional(),
    status: z.string().optional(),
    impact_score: z.string().optional(),
    recommendation: z.string().optional(),
});
export let regulatoryChangesPostBody = z.object({
    source: z.string(),
    title: z.string(),
    description: z.string().optional(),
    framework_code: z.string().optional(),
    severity: z.string().optional(),
    affected_controls: z.string().optional(),
    recommended_action: z.string().optional(),
});
export let regulatoryChangesIdReviewPutBody = z.object({
    status: z.string(),
});
export let provenanceBody = z.object({
    system_id: z.string().min(1),
    model_name: z.string().min(1),
    provider: z.string().min(1),
});
export let lineageBody = z.object({
    system_id: z.string().min(1),
    dataset_name: z.string().min(1),
});
export let providerBody = z.object({
    provider_name: z.string().min(1),
    provider_type: z.string().optional(),
});
export let agreementBody = z.object({
    provider_id: z.string().min(1),
    agreement_type: z.string().min(1),
});
export let agreementStatusBody = z.object({
    status: z.string().min(1),
    reason: z.string().optional(),
});
export let modificationBody = z.object({
    provenance_id: z.string().min(1),
    system_id: z.string().min(1),
    modification_type: z.string().min(1),
    description: z.string().min(1),
});
export let registerBody = z.object({
    system_code: z.string().min(1),
    name_en: z.string().min(1),
    name_ar: z.string().optional(),
    description: z.string().optional(),
    risk_classification: z.string().min(1),
    intended_purpose: z.string().min(1),
    provider_name: z.string().min(1),
    deployment_status: z.string().optional(),
});
export let goNoGoBody = z.object({
    decision: z.enum(['go', 'no_go', 'conditional']),
    rationale: z.string().min(1),
    conditions: z.array(z.string()).optional(),
});
export let idChangePostBody = z.object({
    type: z.string(),
    entityId: z.string(),
    changes: z.string(),
    cascade: z.string().optional(),
});
export let idScenarioPostBody = z.object({});
export let versionsPostBody = z.object({
    asset_id: z.string(),
    provider: z.string(),
    provider_model_id: z.string(),
    config: z.record(z.string(), z.unknown()).optional(),
    change_summary: z.string().optional(),
    notes: z.string().optional(),
});
export let versionsVersionIdPatchBody = z.object({});
export let versionsVersionIdSubmitPostBody = z.object({});
export let versionsVersionIdApprovePostBody = z.object({});
export let versionsVersionIdRejectPostBody = z.object({
    notes: z.string().optional(),
});
export let versionsVersionIdActivatePostBody = z.object({});
export let versionsVersionIdSuspendPostBody = z.object({
    notes: z.string().optional(),
});
export let versionsVersionIdRetirePostBody = z.object({
    notes: z.string().optional(),
});
export let versionsAssetIdRollbackPostBody = z.object({
    target_version_id: z.string(),
    notes: z.string().optional(),
});
export let runPostBody = z.object({
    modelId: z.string(),
    canaryPrompt: z.string(),
});
// ── Auto-generated validation schemas (enterprise hardening) ──
export const updateConfigBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createReseedBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createReindexBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createBackfillBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const updateComplianceBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createClassifyBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createReassessBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createDecommissionBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createExecuteBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createOrgImpactBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createFrameworkBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createOrgChangeBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createMonteCarloBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createImpactAssessmentBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createScoreBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createAiGovernanceBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const updateAiGovernanceBody = createAiGovernanceBody.partial();
export const createTransitionBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createDiscoverBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createAgentToolsBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const updateAgentToolsBody = createAgentToolsBody.partial();
export const createEnableBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createDisableBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createAllowlistBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const updateAllowlistBody = createAllowlistBody.partial();
export const createVersionsBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const updateVersionsBody = createVersionsBody.partial();
export const createSubmitBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createApproveBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createRejectBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createActivateBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createSuspendBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createRetireBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const createRollbackBody = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
//# sourceMappingURL=ai-governance.schemas.js.map
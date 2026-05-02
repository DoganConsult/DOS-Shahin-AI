export type RoleArchetype = 'executive_owner' | 'module_lead' | 'approver' | 'operator' | 'contributor' | 'reviewer' | 'auditor' | 'viewer' | 'external_party' | 'ai_agent';
export type PermissionVerb = 'read' | 'write' | 'delete' | 'approve' | 'manage' | 'export' | 'configure' | 'bulk' | 'execute' | 'interpret' | 'update' | 'verify' | 'close' | 'cancel' | 'reopen' | 'escalate' | 'assign' | 'reassign' | 'submit' | 'review' | 'delegate' | 'conduct' | 'view';
export type DangerLevel = 'safe' | 'moderate' | 'destructive';
export type AuthorityLevel = 'required' | 'recommended' | 'optional';
export type SodSeverity = 'critical' | 'high' | 'medium';
export type SodEnforcement = 'block' | 'warn' | 'log' | 'hard_block';
export type FieldClassification = 'public' | 'internal' | 'confidential' | 'restricted';
export type AiCapability = 'notes' | 'drafts' | 'recommendations' | 'gate_checks' | 'health_monitor' | 'classification' | 'scoring' | 'summarization' | 'anomaly_detection' | 'trend_narration' | 'anomaly_explanation' | 'kpi_summary' | 'benchmark_interpretation' | 'predictive_narrative' | 'governance_context' | 'framework_recommendation' | 'maturity_assessment' | 'staffing_suggestion' | 'next_best_action' | 'workspace_narrative' | 'risk_assessment';
export type AiClassification = 'advisory' | 'pre_screen' | 'decision_influencing' | 'autonomous' | 'blocked';
export type AutomationLevel = 'full' | 'semi' | 'manual';
export type ModuleVisibility = 'internal' | 'external' | 'both';
export type ModuleTier = string;
export type ModuleCategory = string;
export interface ModuleManifest {
    code: string;
    version: string;
    aliases: string[];
    nameEn: string;
    nameAr: string;
    descriptionEn: string;
    descriptionAr: string;
    tier: ModuleTier;
    category: ModuleCategory;
    routeBase: string;
    eventNamespace: string;
    tablePrefix: string;
    ownedTables: string[];
    sharedTables: string[];
    referencedTables: string[];
    aggregateRoots: string[];
    publishedEvents: string[];
    consumedEvents: string[];
    hardDeps: string[];
    softDeps: string[];
    navId?: string;
    navChildCount?: number;
    workflowTemplateCode?: string | null;
    workflowSlaHours?: number | null;
    automationLevel?: AutomationLevel | null;
    agentBinding?: string | null;
    aiCapabilities?: AiCapability[];
    aiEnabled?: boolean;
    featureFlags?: string[];
    installable?: boolean;
    provisioningOrder?: number;
    licensingTier?: 'starter' | 'professional' | 'enterprise';
    visibility?: ModuleVisibility;
    adminSurfaces?: string[];
    lifecycleParticipation?: boolean;
    uiSurfaces?: string[];
    healthSignals?: string[];
    /** A3 — Contract auto-discovery: list of contractIds this module consumes. */
    usedContracts?: string[];
    /** A7 — MCP auto-registrar: relative import path to this module's primary service. */
    mcpServiceEntrypoint?: string;
    securityPermissions?: ModulePermission[];
    securityRoles?: ModuleRole[];
    securityActions?: ModuleAction[];
    approvalRules?: ApprovalRule[];
    ownershipRules?: OwnershipRule[];
    sodRules?: SoDRule[];
}
export interface ModulePermission {
    permissionCode: string;
    resourceType: string;
    actionType: PermissionVerb;
    descriptionEn: string;
    descriptionAr: string;
    sensitive: boolean;
    fieldLevel: boolean;
    fieldScope?: string[];
    aiOnly: boolean;
    externalParty: boolean;
    deprecated: boolean;
    legacyAliases: string[];
}
export interface ModuleRole {
    roleCode: string;
    archetype: RoleArchetype;
    nameEn: string;
    nameAr: string;
    descriptionEn: string;
    descriptionAr: string;
    isDefault: boolean;
    isSystem: boolean;
    isGlobal: boolean;
    permissions: string[];
    authorityLevel: AuthorityLevel;
    defaultScope: 'own' | 'team' | 'department' | 'org' | 'global';
}
export interface ModuleAction {
    actionCode: string;
    labelEn: string;
    labelAr: string;
    descriptionEn?: string;
    descriptionAr?: string;
    requiredPermissions: string[];
    requiredAuthorityLevel: AuthorityLevel;
    sodSensitive: boolean;
    aiEnabled: boolean;
    aiBlocked: boolean;
    aiClassification?: AiClassification;
    dangerLevel: DangerLevel;
    requiresWorkflow: boolean;
    requiresApproval: boolean;
    requiresHumanReview?: boolean;
    auditable: boolean;
    reversible: boolean;
    bulkSafe: boolean;
    externalExposure: boolean;
}
export interface ApprovalRule {
    entityType: string;
    fromStatus: string;
    toStatus: string;
    requiredRole: string;
    requiredPermission: string;
    authorityLevel: AuthorityLevel;
    scopeRule: 'own' | 'team' | 'department' | 'org' | 'global';
    minApprovers: number;
    escalationPath: string[];
    timeoutHours: number;
    autoApproveAllowed: boolean;
    overrideRoles: string[];
    evidenceRequired: boolean;
    commentsRequired: boolean;
}
export interface OwnershipRule {
    entityType: string;
    ownerField: string;
    reviewerField: string | null;
    approverField: string | null;
    assigneeField: string | null;
    orgScopeField: string | null;
    defaultOwnerRole: string;
    canDelegate: boolean;
    delegateRoles: string[];
    canReassign: boolean;
    reassignRoles: string[];
    requiresApproval: boolean;
    creatorRights: 'full' | 'read_only' | 'none';
    externalVisible: boolean;
    rowLevelAccess: 'owner_only' | 'team' | 'department' | 'org' | 'global';
}
export interface SoDRule {
    ruleCode: string;
    descriptionEn: string;
    descriptionAr: string;
    conflictingRoles: string[];
    conflictingActions: string[];
    conflictingPermissions?: string[];
    conflictingTransitions: string[];
    severity: SodSeverity;
    enforcement: SodEnforcement;
    temporaryWaiverAllowed: boolean;
    waiverMaxDays: number | null;
    compensatingControls: string[];
    overrideAuthority: string[];
    auditObligations: string[];
}
export interface ModuleEventContract {
    moduleCode: string;
    published: Record<string, {
        description: string;
        version: number;
        payloadType: string;
    }>;
    consumed: Record<string, {
        source: string;
        handler: string;
        idempotent: boolean;
        retryPolicy: 'none' | 'exponential' | 'fixed';
        deadLetterEnabled: boolean;
    }>;
}
export interface ModuleEventPayload {
    tenantId: string;
    entityType: string;
    entityId: string;
    moduleCode: string;
    triggeredBy: string;
    timestamp: string;
    correlationId: string;
    eventVersion: number;
    previousState?: string;
    newState?: string;
    data: Record<string, unknown>;
}
export type CanonicalModuleCode = 'risk' | 'compliance' | 'policy' | 'evidence' | 'audit' | 'incident' | 'exception' | 'governance' | 'vendor' | 'bcp' | 'asset' | 'remediation' | 'action' | 'training' | 'qiyas' | 'ai-governance' | 'reporting' | 'ai' | 'integrations' | 'analytics' | 'controls' | 'dora' | 'ksa-regulatory' | 'local-knowledge' | 'packs' | 'proactive-leadership' | 'agrc-engine' | 'dashboard' | 'widgets' | 'knowledge' | 'mcp' | 'fitch' | 'inbox' | 'portals' | 'records' | 'privacy' | 'journey' | 'benchmarks' | 'mobile' | 'operating-cockpit' | 'team' | 'governance-os' | 'governance-ai' | 'executive' | 'dashboard-editor' | 'notification' | 'workflow' | 'onboarding' | 'issues' | 'playbooks' | 'attestation' | 'grc-query' | 'foundation' | string;

export interface TenantContract {
    tenantId: string;
    name: string;
    status: 'active' | 'inactive' | 'suspended' | 'provisioning';
    plan: string;
    language: string;
    timezone: string;
}
export interface WorkspaceContract {
    workspaceId: string;
    tenantId: string;
    name: string;
    type: 'default' | 'project' | 'sandbox';
    isActive: boolean;
}
export interface ProductContract {
    productCode: string;
    name: string;
    version: string;
    isActive: boolean;
    ownedModules: string[];
    optionalModules: string[];
}
export interface ModuleContract {
    moduleCode: string;
    name: string;
    version: string;
    tier: string;
    category: string;
    isActive: boolean;
    routeBase: string;
    eventNamespace: string;
}
export interface ProvisioningContract {
    tenantId: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    steps: ProvisioningStep[];
    startedAt: string;
    completedAt: string | null;
}
export interface ProvisioningStep {
    stepName: string;
    status: 'pending' | 'completed' | 'failed' | 'skipped';
    order: number;
    error: string | null;
}
export interface ShellContract {
    navigationGroups: NavigationGroup[];
    dashboardBundles: string[];
    widgetSlots: string[];
}
export interface NavigationGroup {
    groupId: string;
    label: string;
    icon: string;
    order: number;
    items: NavigationItem[];
}
export interface NavigationItem {
    id: string;
    label: string;
    route: string;
    icon: string;
    moduleCode: string | null;
    requiredPermission: string | null;
}
export interface FeatureFlagContract {
    flagCode: string;
    tenantId: string;
    isEnabled: boolean;
    metadata: Record<string, unknown>;
}
export interface AccessProfileContract {
    id: string;
    code: string;
    name: string;
    description?: string;
    isActive: boolean;
    assignedCount: number;
}
export interface FunctionalRoleContract {
    id: string;
    code: string;
    moduleCode: string;
    name: string;
    category: string;
    isActive: boolean;
    assignedCount: number;
}
export interface PermissionContract {
    id: string;
    code: string;
    description?: string;
    moduleCode?: string;
    resource?: string;
    action?: string;
    isActive: boolean;
}
export interface RolePermissionContract {
    id: string;
    functionalRoleId: string;
    permissionId: string;
    roleCode: string;
    roleName: string;
    permissionCode: string;
}
export interface DelegationContract {
    id: string;
    delegatorId: string;
    delegateId: string;
    permissionScope?: string;
    reason?: string;
    status: 'active' | 'revoked' | 'expired';
    expiresAt?: string;
    createdAt: string;
}
export interface SodRuleContract {
    id: string;
    ruleCode: string;
    conflictingRoleA?: string;
    conflictingRoleB?: string;
    description?: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    isActive: boolean;
}
export interface PlatformConfigContract {
    configKey: string;
    configValue: unknown;
    description?: string;
    ownerLayer: string;
    updatedAt: string;
}
export interface AuditLogContract {
    id: string;
    action: string;
    entityType?: string;
    entityId?: string;
    actorId?: string;
    actorEmail?: string;
    beforeState?: unknown;
    afterState?: unknown;
    metadata?: Record<string, unknown>;
    createdAt: string;
}
export interface SystemEventContract {
    id: string;
    eventType: string;
    severity: 'info' | 'warning' | 'critical';
    source?: string;
    message?: string;
    metadata?: Record<string, unknown>;
    occurredAt: string;
}
export interface LoginAttemptContract {
    id: string;
    email?: string;
    userId?: string;
    tenantId?: string;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    failureReason?: string;
    attemptedAt: string;
}
export interface TenantProductActivationContract {
    tenantId: string;
    productCode: string;
    status: 'active' | 'inactive';
    activatedAt?: string;
    activatedBy?: string;
}
export interface AiModelContract {
    id: string;
    provider: string;
    modelCode: string;
    name?: string;
    capabilities?: string[];
    isActive: boolean;
}
export interface AiAgentContract {
    id: string;
    agentCode: string;
    name?: string;
    capabilities?: string[];
    modelCode?: string;
    isActive: boolean;
}
export interface AiPromptContract {
    id: string;
    promptCode: string;
    name?: string;
    template?: string;
    modelCode?: string;
    moduleCode?: string;
    isActive: boolean;
}
export interface PlatformOverviewContract {
    tenants: number;
    workspaces: number;
    actors: number;
    accessProfiles: number;
    functionalRoles: number;
    permissions: number;
    timestamp: string;
}
export interface GovernanceMatrixContract {
    levels: GovernanceLevel[];
    authorizationChain: string[];
    accessProfiles: string[];
}
export interface GovernanceLevel {
    level: string;
    governor: string;
    controls: string[];
}

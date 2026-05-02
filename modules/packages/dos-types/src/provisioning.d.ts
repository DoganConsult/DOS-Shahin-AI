/**
 * @dos/types — provisioning, onboarding, and tenant management types
 * Covers tenant lifecycle, feature flags, onboarding, subscriptions
 */
export type TenantStatus = 'active' | 'trial' | 'suspended' | 'pending_setup' | 'offboarding' | 'terminated';
export type TenantTier = 'starter' | 'professional' | 'enterprise' | 'government' | 'custom';
export interface Tenant {
    tenantId: string;
    name: string;
    nameAr?: string;
    code: string;
    status: TenantStatus;
    tier: TenantTier;
    domain?: string;
    logoUrl?: string;
    primaryColor?: string;
    industry?: string;
    countryCode?: string;
    defaultLanguage?: 'en' | 'ar' | string;
    defaultTimezone?: string;
    registrationNumber?: string;
    vatNumber?: string;
    billingEmail?: string;
    technicalContactEmail?: string;
    adminUserId?: string;
    onboardedAt?: string;
    trialEndsAt?: string;
    contractStartDate?: string;
    contractEndDate?: string;
    maxUsers?: number;
    maxStorageGB?: number;
    features?: Record<string, boolean>;
    modules?: Record<string, TenantModuleConfig>;
    integrations?: Record<string, boolean>;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface TenantModuleConfig {
    enabled: boolean;
    tier?: string;
    settings?: Record<string, unknown>;
    activatedAt?: string;
    expiresAt?: string;
}
export type FeatureFlagStatus = 'enabled' | 'disabled' | 'preview' | 'beta' | 'deprecated';
export type FeatureFlagTargeting = 'global' | 'tenant' | 'role' | 'user' | 'percentage';
export interface FeatureFlag {
    flagId: string;
    key: string;
    name: string;
    description?: string;
    status: FeatureFlagStatus;
    targeting: FeatureFlagTargeting;
    enabledForTenants?: string[];
    enabledForRoles?: string[];
    enabledForUsers?: string[];
    rolloutPercent?: number;
    killSwitchEnabled?: boolean;
    defaultValue?: boolean | string | number;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface FeatureFlagEvaluation {
    flagId: string;
    key: string;
    tenantId: string;
    userId?: string;
    value: boolean | string | number;
    reason: 'default' | 'tenant_override' | 'user_override' | 'role_override' | 'rollout' | 'kill_switch';
    evaluatedAt: string;
}
export type OnboardingStepStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'blocked';
export interface OnboardingPlan {
    planId: string;
    tenantId: string;
    templateId?: string;
    name?: string;
    tier?: TenantTier;
    status: 'pending' | 'in_progress' | 'completed' | 'stalled';
    completionPercent: number;
    steps: OnboardingStep[];
    assignedCsm?: string;
    targetCompletionDate?: string;
    completedAt?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}
export interface OnboardingStep {
    stepId: string;
    planId: string;
    order: number;
    title: string;
    titleAr?: string;
    description?: string;
    category?: 'setup' | 'training' | 'configuration' | 'integration' | 'data' | 'go_live';
    status: OnboardingStepStatus;
    required: boolean;
    assignedTo?: string;
    completedAt?: string;
    completedBy?: string;
    guideUrl?: string;
    videoUrl?: string;
    dependsOn?: string[];
    durationEstimateMinutes?: number;
}
export interface OnboardingTemplate {
    templateId: string;
    name: string;
    tier?: TenantTier;
    steps: Omit<OnboardingStep, 'planId' | 'status' | 'completedAt' | 'completedBy'>[];
    estimatedDays?: number;
    createdAt: string;
    updatedAt: string;
}
export type ProvisioningStatus = 'pending' | 'running' | 'completed' | 'failed' | 'rollback_in_progress' | 'rolled_back';
export interface ProvisioningJob {
    jobId: string;
    tenantId?: string;
    type: 'tenant_creation' | 'module_activation' | 'workspace_setup' | 'integration_setup' | 'deprovisioning' | 'upgrade';
    status: ProvisioningStatus;
    steps: ProvisioningStep[];
    currentStep?: number;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    errorMessage?: string;
    startedAt?: string;
    completedAt?: string;
    triggeredBy?: string;
    correlation?: string;
    rollbackJobId?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface ProvisioningStep {
    stepId: string;
    name: string;
    description?: string;
    status: ProvisioningStatus;
    startedAt?: string;
    completedAt?: string;
    durationMs?: number;
    result?: Record<string, unknown>;
    errorMessage?: string;
    rollbackable?: boolean;
    rolledBackAt?: string;
}
export type SubscriptionStatus = 'active' | 'trial' | 'past_due' | 'cancelled' | 'paused' | 'pending';
export type BillingCycle = 'monthly' | 'quarterly' | 'annual';
export interface Subscription {
    subscriptionId: string;
    tenantId: string;
    tier: TenantTier;
    status: SubscriptionStatus;
    billingCycle: BillingCycle;
    currency: string;
    amount: number;
    discount?: number;
    startDate: string;
    endDate?: string;
    renewalDate?: string;
    cancelledAt?: string;
    cancellationReason?: string;
    paymentMethodId?: string;
    invoiceEmail?: string;
    seats?: number;
    addOns?: SubscriptionAddOn[];
    createdAt: string;
    updatedAt: string;
}
export interface SubscriptionAddOn {
    addOnId: string;
    name: string;
    units?: number;
    unitPrice?: number;
    total?: number;
    activatedAt: string;
}
export interface WorkspaceProvisioningConfig {
    tenantId: string;
    workspaceId: string;
    name: string;
    modules: string[];
    features?: Record<string, boolean>;
    userIds?: string[];
    teamIds?: string[];
    defaultUser?: string;
    seedData?: boolean;
    seedTemplate?: string;
    cloneFromWorkspaceId?: string;
    settings?: Record<string, unknown>;
}
export interface TenantCapacityReport {
    tenantId: string;
    period: string;
    users: {
        current: number;
        max: number;
        percent: number;
    };
    storage: {
        currentGB: number;
        maxGB: number;
        percent: number;
    };
    apiCalls: {
        count: number;
        limit: number;
        percent: number;
    };
    workspaces: {
        current: number;
        max: number;
    };
    lastCalculatedAt: string;
    alerts?: TenantCapacityAlert[];
}
export interface TenantCapacityAlert {
    type: 'users' | 'storage' | 'api_calls' | 'workspaces';
    threshold: number;
    currentPercent: number;
    message: string;
}

/**
 * @dos/types — Phase G canonical trial lifecycle types.
 *
 * Source of truth: platform/docs/PLATFORM_OPERATING_MANIFEST.md §G,
 * platform/dos/migrations/public/20260501_0200_phase_g_trial_lifecycle.sql.
 *
 * These types are the contract for tenant-service /register, /trials APIs,
 * the trial-lifecycle-sync handler, and the contract-driven trial banner.
 */
export type TrialStatus = 'trial_pending_verification' | 'trial_active' | 'trial_expiring' | 'trial_grace' | 'trial_suspended' | 'trial_converted' | 'trial_cancelled' | 'trial_expired' | 'tenant_archived';
export type TrialVerificationStatus = 'pending' | 'verified' | 'rejected' | 'bypassed';
export type TrialSource = 'self_registration' | 'admin_provisioned' | 'sales_qualified' | 'partner_provisioned' | 'migrated';
export interface TenantTrial {
    trialId: string;
    tenantId: string;
    productCode: string;
    planCode?: string;
    status: TrialStatus;
    startsAt: string;
    endsAt: string;
    graceEndsAt?: string | null;
    convertedAt?: string | null;
    cancelledAt?: string | null;
    suspendedAt?: string | null;
    createdByUserId?: string | null;
    signupDomain?: string | null;
    verificationStatus: TrialVerificationStatus;
    source: TrialSource;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export type SubscriptionLifecycleStatus = 'trialing' | 'active' | 'past_due' | 'grace' | 'suspended' | 'cancelled' | 'expired' | 'converted';
export type BillingLifecycleStatus = 'no_payment_required' | 'payment_provider_pending' | 'invoice_pending' | 'invoice_paid' | 'payment_failed' | 'manually_approved' | 'external_provider_active';
export type BillingProviderMode = 'manual' | 'invoice_offline' | 'payment_provider_pending' | 'external_provider';
export interface TenantSubscription {
    subscriptionId: string;
    tenantId: string;
    productCode: string;
    planCode?: string;
    status: SubscriptionLifecycleStatus;
    billingStatus: BillingLifecycleStatus;
    trialId?: string | null;
    currentPeriodStart: string;
    currentPeriodEnd?: string | null;
    graceEndsAt?: string | null;
    providerMode: BillingProviderMode;
    providerRef?: string | null;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export type EntitlementLifecycleStatus = 'active' | 'expired' | 'suspended' | 'cancelled' | 'pending' | 'not_entitled';
export type EntitlementSource = 'trial' | 'paid' | 'internal' | 'admin' | 'manual' | 'platform_dna';
export interface TenantProductEntitlement {
    entitlementId: string;
    tenantId: string;
    productCode: string;
    entitlementStatus: EntitlementLifecycleStatus;
    source: Exclude<EntitlementSource, 'platform_dna'>;
    trialId?: string | null;
    subscriptionId?: string | null;
    startsAt: string;
    endsAt?: string | null;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface TenantModuleEntitlement {
    entitlementId: string;
    tenantId: string;
    productCode: string;
    moduleCode: string;
    entitlementStatus: EntitlementLifecycleStatus;
    source: EntitlementSource;
    trialId?: string | null;
    subscriptionId?: string | null;
    limitsJson: ModuleLimits;
    startsAt: string;
    endsAt?: string | null;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface ModuleLimits {
    maxUsers?: number;
    maxRecords?: number;
    maxExports?: number;
    maxAiRuns?: number;
    maxFileStorageMb?: number;
    disabledIntegrations?: string[];
    watermarkExports?: boolean;
    [key: string]: unknown;
}
export type TrialAuditAction = 'trial_created' | 'trial_email_verified' | 'trial_activated' | 'trial_expiring_notice' | 'trial_grace_started' | 'trial_suspended' | 'trial_converted' | 'trial_cancelled' | 'trial_expired' | 'trial_extended' | 'trial_reset' | 'trial_owner_changed' | 'tenant_archived';
export interface TrialAuditEntry {
    auditId: number;
    tenantId: string;
    trialId?: string | null;
    userId?: string | null;
    productCode?: string | null;
    action: TrialAuditAction;
    oldStatus?: string | null;
    newStatus?: string | null;
    reason?: string | null;
    metadataJson: Record<string, unknown>;
    createdAt: string;
}
/**
 * Disabled-module reason codes consumed by Dynamic UI / nav resolver.
 * Foundation MUST NEVER be marked 'not-entitled'.
 */
export type ModuleDisabledReason = 'not-entitled' | 'missing-permission' | 'backend-offline' | 'route-not-wired' | 'trial-expired' | 'trial-limit-reached';
/**
 * Resolver-facing trial summary returned by GET /api/trials/current.
 * Drives the contract-driven trial banner + trial card.
 */
export interface TrialSummary {
    hasTrial: boolean;
    trial?: TenantTrial;
    subscription?: TenantSubscription;
    daysRemaining?: number;
    graceDaysRemaining?: number | null;
    allowedModules: string[];
    limits: Record<string, ModuleLimits>;
    upgradeAvailable: boolean;
    conversionEnabled: boolean;
}

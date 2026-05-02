import { Request, Response, NextFunction } from 'express';
/**
 * Subscription Status Guard — Extracted from monolith platform/dos/http/guards/subscription-status-guard.ts
 *
 * Validates the tenant's subscription status before allowing access to
 * billable/premium routes. Supports grace periods, trial states, and
 * read-only degraded modes.
 *
 * Subscription states:
 *   active        — full access
 *   trial         — full access (within trial window)
 *   grace         — full access (payment overdue, within grace window)
 *   suspended     — read-only access (GET/HEAD/OPTIONS only)
 *   expired       — blocked (no access)
 *   cancelled     — blocked (no access)
 */
export type SubscriptionStatus = 'active' | 'trial' | 'grace' | 'suspended' | 'expired' | 'cancelled';
export interface SubscriptionInfo {
    status: SubscriptionStatus;
    plan?: string;
    expiresAt?: string | Date;
    graceEndsAt?: string | Date;
}
export interface SubscriptionStatusGuardOptions {
    /** Callback to fetch subscription info for a tenant. */
    subscriptionLookup?: (tenantId: string) => Promise<SubscriptionInfo | null>;
    /** Statuses that allow full read-write access. Default: ['active', 'trial', 'grace'] */
    allowedStatuses?: SubscriptionStatus[];
    /** Statuses that allow read-only (GET/HEAD/OPTIONS) access. Default: ['suspended'] */
    readOnlyStatuses?: SubscriptionStatus[];
    /** Route prefixes exempt from subscription checks (e.g. billing pages). */
    exemptPrefixes?: string[];
    /** When true, platform-admin users bypass subscription checks. Default: true. */
    allowPlatformAdmin?: boolean;
}
/**
 * Register the subscription lookup function at bootstrap time.
 */
export declare function setSubscriptionLookup(fn: (tenantId: string) => Promise<SubscriptionInfo | null>): void;
export declare function subscriptionStatusGuard(options?: SubscriptionStatusGuardOptions): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Invalidate subscription cache for a tenant (e.g. after payment or plan change).
 */
export declare function invalidateSubscriptionCache(tenantId: string): void;
/**
 * Clear all subscription cache entries.
 */
export declare function clearSubscriptionCache(): void;

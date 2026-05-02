import { Request, Response, NextFunction } from 'express';
import { logger } from '@dos/platform-core/observability';

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

export type SubscriptionStatus =
  | 'active'
  | 'trial'
  | 'grace'
  | 'suspended'
  | 'expired'
  | 'cancelled';

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

/** In-memory cache for subscription info. */
const subscriptionCache = new Map<string, { info: SubscriptionInfo; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

let _subscriptionLookup: ((tenantId: string) => Promise<SubscriptionInfo | null>) | null = null;

/**
 * Register the subscription lookup function at bootstrap time.
 */
export function setSubscriptionLookup(fn: (tenantId: string) => Promise<SubscriptionInfo | null>): void {
  _subscriptionLookup = fn;
}

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const DEFAULT_ALLOWED: SubscriptionStatus[] = ['active', 'trial', 'grace'];
const DEFAULT_READ_ONLY: SubscriptionStatus[] = ['suspended'];
const DEFAULT_EXEMPT_PREFIXES = [
  '/health',
  '/ready',
  '/info',
  '/metrics',
  '/api/auth',
  '/api/billing',
  '/api/subscriptions',
  '/api/platform-admin',
];

export function subscriptionStatusGuard(options?: SubscriptionStatusGuardOptions) {
  const allowedStatuses = new Set(options?.allowedStatuses ?? DEFAULT_ALLOWED);
  const readOnlyStatuses = new Set(options?.readOnlyStatuses ?? DEFAULT_READ_ONLY);
  const exemptPrefixes = options?.exemptPrefixes ?? DEFAULT_EXEMPT_PREFIXES;
  const allowPlatformAdmin = options?.allowPlatformAdmin ?? true;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip exempt routes
    const path = req.path.toLowerCase();
    for (const prefix of exemptPrefixes) {
      if (path === prefix || path.startsWith(prefix + '/')) {
        return next();
      }
    }

    const tenantId: string | undefined = (req as any).tenantId || req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      // No tenant context — let tenant-guard handle this
      return next();
    }

    // Platform admins bypass subscription checks
    if (allowPlatformAdmin) {
      const user = (req as any).user;
      if (user?.role === 'platform_admin' || user?.isPlatformAdmin === true) {
        return next();
      }
    }

    const lookup = options?.subscriptionLookup || _subscriptionLookup;
    if (!lookup) {
      // No lookup registered — fail open in dev, closed in production
      if (process.env.NODE_ENV === 'production') {
        logger.error('[subscription-guard] No subscription lookup registered — failing closed');
        res.status(503).json({
          error: 'Subscription verification unavailable',
          code: 'SUBSCRIPTION_GUARD_NOT_INITIALIZED',
        });
        return;
      }
      return next();
    }

    let info: SubscriptionInfo | null;

    // Check cache
    const cached = subscriptionCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      info = cached.info;
    } else {
      try {
        info = await lookup(tenantId);
        if (info) {
          subscriptionCache.set(tenantId, { info, expiresAt: Date.now() + CACHE_TTL_MS });
        }
      } catch (err: any) {
        logger.error('[subscription-guard] Subscription lookup failed', { tenantId, error: err?.message });
        res.status(503).json({
          error: 'Unable to verify subscription status',
          code: 'SUBSCRIPTION_VERIFICATION_ERROR',
        });
        return;
      }
    }

    if (!info) {
      logger.warn('[subscription-guard] No subscription found for tenant', { tenantId });
      res.status(403).json({
        error: 'No active subscription found',
        code: 'SUBSCRIPTION_NOT_FOUND',
      });
      return;
    }

    // Full access statuses
    if (allowedStatuses.has(info.status)) {
      // Attach subscription info for downstream use
      (req as any).subscription = info;
      return next();
    }

    // Read-only statuses — allow GET/HEAD/OPTIONS only
    if (readOnlyStatuses.has(info.status)) {
      if (READ_METHODS.has(req.method)) {
        (req as any).subscription = info;
        res.setHeader('X-Subscription-Status', info.status);
        res.setHeader('X-Subscription-Mode', 'read-only');
        return next();
      }

      logger.info('[subscription-guard] Write operation blocked — subscription suspended', {
        tenantId,
        status: info.status,
        method: req.method,
        path: req.path,
      });
      res.status(403).json({
        error: 'Subscription suspended — read-only access',
        code: 'SUBSCRIPTION_SUSPENDED',
        status: info.status,
      });
      return;
    }

    // Blocked statuses (expired, cancelled, or any unknown status)
    logger.info('[subscription-guard] Access blocked — subscription not active', {
      tenantId,
      status: info.status,
      path: req.path,
    });
    res.status(403).json({
      error: `Subscription ${info.status} — access denied`,
      code: 'SUBSCRIPTION_BLOCKED',
      status: info.status,
    });
  };
}

/**
 * Invalidate subscription cache for a tenant (e.g. after payment or plan change).
 */
export function invalidateSubscriptionCache(tenantId: string): void {
  subscriptionCache.delete(tenantId);
}

/**
 * Clear all subscription cache entries.
 */
export function clearSubscriptionCache(): void {
  subscriptionCache.clear();
}

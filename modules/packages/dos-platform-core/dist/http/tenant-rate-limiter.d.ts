import { Request, Response, NextFunction } from 'express';
export type RateLimitTier = 'free' | 'starter' | 'professional' | 'enterprise' | 'unlimited';
export interface TierLimits {
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
    maxBurstSize: number;
    concurrentRequestLimit: number;
}
export declare const DEFAULT_TIER_LIMITS: Record<RateLimitTier, TierLimits>;
export interface TenantRateLimitConfig {
    tierResolver: (req: Request) => RateLimitTier | Promise<RateLimitTier>;
    tenantIdExtractor?: (req: Request) => string;
    tierLimits?: Partial<Record<RateLimitTier, Partial<TierLimits>>>;
    onRateLimited?: (tenantId: string, tier: RateLimitTier, req: Request) => void;
    bypassCheck?: (req: Request) => boolean;
}
export declare function tenantAwareRateLimiter(config: TenantRateLimitConfig): (req: Request, res: Response, next: NextFunction) => Promise<void>;

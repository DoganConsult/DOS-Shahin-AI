import { describe, it, expect } from 'vitest';
import { tenantAwareRateLimiter, DEFAULT_TIER_LIMITS } from '../http/tenant-rate-limiter';

describe('tenantAwareRateLimiter', () => {
  it('returns middleware function', () => {
    const mw = tenantAwareRateLimiter({ tierResolver: () => 'enterprise' });
    expect(typeof mw).toBe('function');
  });

  it('DEFAULT_TIER_LIMITS has all tiers', () => {
    expect(DEFAULT_TIER_LIMITS).toHaveProperty('free');
    expect(DEFAULT_TIER_LIMITS).toHaveProperty('starter');
    expect(DEFAULT_TIER_LIMITS).toHaveProperty('professional');
    expect(DEFAULT_TIER_LIMITS).toHaveProperty('enterprise');
    expect(DEFAULT_TIER_LIMITS).toHaveProperty('unlimited');
  });

  it('enterprise tier allows more requests than free', () => {
    expect(DEFAULT_TIER_LIMITS.enterprise.maxRequestsPerMinute).toBeGreaterThan(DEFAULT_TIER_LIMITS.free.maxRequestsPerMinute);
  });
});

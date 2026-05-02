/**
 * Shared rate limiters and config for AGRC-OS sub-routers.
 * Used by all domain route files under agrc-os/ so limiters are defined once.
 */
import { rateLimiter } from '../../ports/middleware.port';

export const heavyOpLimiter = rateLimiter({
  windowMs: 60_000,
  maxRequests: 5,
  namespace: 'agrc-heavy',
  keyGenerator: (req: any) => req.tenantId || req.ip || 'any',
});

export const writeLimiter = rateLimiter({
  windowMs: 60_000,
  maxRequests: 30,
  namespace: 'agrc-write',
  keyGenerator: (req: any) => req.tenantId || req.ip || 'any',
});

export const webhookLimiter = rateLimiter({
  windowMs: 60_000,
  maxRequests: 200,
  namespace: 'agrc-webhook',
  keyGenerator: (req: any) => (req.headers['x-api-key'] as string) || req.ip || 'any',
});

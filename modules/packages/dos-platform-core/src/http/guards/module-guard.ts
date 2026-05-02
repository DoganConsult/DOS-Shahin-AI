import { Request, Response, NextFunction } from 'express';
import { logger } from '@dos/platform-core/observability';

/**
 * Module Guard — Extracted from monolith platform/dos/http/guards/module-guard.ts
 *
 * Ensures the requesting tenant has the specified module enabled before allowing
 * access to module-scoped routes. Modules are gated by the tenant's subscription
 * and provisioning state.
 *
 * Usage:
 *   router.use('/api/risk', moduleGuard('risk'), riskRoutes);
 *   router.use('/api/compliance', moduleGuard('compliance'), complianceRoutes);
 */

export interface ModuleGuardOptions {
  /** Callback to check if a module is enabled for a tenant. */
  moduleLookup?: (tenantId: string, moduleCode: string) => Promise<boolean>;
  /** When true, platform-admin users bypass module checks. Default: true. */
  allowPlatformAdmin?: boolean;
}

/** In-memory cache for module access (tenantId:moduleCode -> { result, expiresAt }). */
const moduleAccessCache = new Map<string, { result: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds

let _moduleLookup: ((tenantId: string, moduleCode: string) => Promise<boolean>) | null = null;

/**
 * Register the module lookup function at bootstrap time.
 * Typically called from service-bootstrap after DB is ready.
 */
export function setModuleLookup(fn: (tenantId: string, moduleCode: string) => Promise<boolean>): void {
  _moduleLookup = fn;
}

export function moduleGuard(moduleCode: string, options?: ModuleGuardOptions) {
  const allowPlatformAdmin = options?.allowPlatformAdmin ?? true;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tenantId: string | undefined = (req as any).tenantId || req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      res.status(403).json({
        error: 'Tenant context required for module access',
        code: 'TENANT_CONTEXT_MISSING',
      });
      return;
    }

    // Platform admins bypass module gating
    if (allowPlatformAdmin) {
      const user = (req as any).user;
      if (user?.role === 'platform_admin' || user?.isPlatformAdmin === true) {
        return next();
      }
    }

    const lookup = options?.moduleLookup || _moduleLookup;
    if (!lookup) {
      // If no lookup is registered, fail open with a warning in non-production
      // and fail closed in production
      if (process.env.NODE_ENV === 'production') {
        logger.error('[module-guard] No module lookup registered — failing closed', { moduleCode, tenantId });
        res.status(503).json({
          error: 'Module access verification unavailable',
          code: 'MODULE_GUARD_NOT_INITIALIZED',
        });
        return;
      }
      logger.warn('[module-guard] No module lookup registered — allowing in non-production', { moduleCode, tenantId });
      return next();
    }

    // Check cache first
    const cacheKey = `${tenantId}:${moduleCode}`;
    const cached = moduleAccessCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      if (!cached.result) {
        res.status(403).json({
          error: `Module '${moduleCode}' is not enabled for this tenant`,
          code: 'MODULE_NOT_ENABLED',
          module: moduleCode,
        });
        return;
      }
      return next();
    }

    try {
      const enabled = await lookup(tenantId, moduleCode);
      moduleAccessCache.set(cacheKey, { result: enabled, expiresAt: Date.now() + CACHE_TTL_MS });

      if (!enabled) {
        logger.info('[module-guard] Module not enabled for tenant', { moduleCode, tenantId });
        res.status(403).json({
          error: `Module '${moduleCode}' is not enabled for this tenant`,
          code: 'MODULE_NOT_ENABLED',
          module: moduleCode,
        });
        return;
      }

      next();
    } catch (err: any) {
      logger.error('[module-guard] Module lookup failed', { moduleCode, tenantId, error: err?.message });
      res.status(503).json({
        error: 'Unable to verify module access',
        code: 'MODULE_VERIFICATION_ERROR',
      });
    }
  };
}

/**
 * Invalidate the module access cache for a tenant (e.g. after subscription change).
 */
export function invalidateModuleCache(tenantId: string): void {
  for (const key of moduleAccessCache.keys()) {
    if (key.startsWith(`${tenantId}:`)) {
      moduleAccessCache.delete(key);
    }
  }
}

/**
 * Invalidate all module access cache entries.
 */
export function clearModuleCache(): void {
  moduleAccessCache.clear();
}

const _productTokens = new Map<string, { productCode: string; label?: string }>();
const _productKeys = new Set<string>();

export function registerProductToken(token: string, productCode: string, label?: string): void {
  _productTokens.set(token, { productCode, label });
}

export function registerProductKey(productKey: string): void {
  _productKeys.add(productKey);
}

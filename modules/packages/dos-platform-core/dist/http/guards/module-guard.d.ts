import { Request, Response, NextFunction } from 'express';
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
/**
 * Register the module lookup function at bootstrap time.
 * Typically called from service-bootstrap after DB is ready.
 */
export declare function setModuleLookup(fn: (tenantId: string, moduleCode: string) => Promise<boolean>): void;
export declare function moduleGuard(moduleCode: string, options?: ModuleGuardOptions): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Invalidate the module access cache for a tenant (e.g. after subscription change).
 */
export declare function invalidateModuleCache(tenantId: string): void;
/**
 * Invalidate all module access cache entries.
 */
export declare function clearModuleCache(): void;
export declare function registerProductToken(token: string, productCode: string, label?: string): void;
export declare function registerProductKey(productKey: string): void;

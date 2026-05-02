/**
 * DAuth AccessResolver — Express middleware wrapping the 14-step decision engine.
 *
 * Law 1: One canonical service per concern.
 * Law 2: Data-driven security — reads from DB, not scattered files.
 * §7.5: Full effective decision formula (14 checks).
 */
import { Request, Response, NextFunction } from 'express';
import { invalidatePermissionCache } from './decision-engine';
export { invalidatePermissionCache };
/**
 * Require a specific permission — runs full 14-step decision pipeline.
 *
 * Super-admin bypass: `is_super_admin === true` skips step 8 (role permission check)
 * but all other checks still run (tenant membership, tenant active, module enabled,
 * access profile, SoD, decision logging). Scope-reduction plan: Phase 4 adds audit
 * logging for every super-admin bypass; Phase 5 introduces explicit emergency access.
 */
export declare function requirePermission(permissionCode: string): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Require any of multiple permissions — first one that passes wins.
 */
export declare function requireAnyPermission(...permissionCodes: string[]): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void;
/**
 * @deprecated Use `requirePermission(permissionCode)` instead.
 * @removal-date 2026-06-30
 * @owner DAuth
 * @replacement requirePermission() — define proper permission codes per AGENTS.md §7.3
 *
 * Require a specific role — routes through the 14-step decision engine.
 * Uses a synthetic permission code `platform.role.<roleName>` so that the
 * full pipeline (tenant membership, tenant active, module enabled, SoD,
 * audit logging) still executes.
 *
 * WARNING: This function checks raw role strings, bypassing the canonical
 * permission-based access model. All route files should use requirePermission()
 * with proper `module.resource.action` permission codes.
 */
export declare function requireRole(...allowedRoles: string[]): (req: Request, res: Response, next: NextFunction) => Promise<void>;

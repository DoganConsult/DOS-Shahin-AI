import type {} from '@dos/types/express';
/**
 * DAuth AccessResolver — Express middleware wrapping the 14-step decision engine.
 *
 * Law 1: One canonical service per concern.
 * Law 2: Data-driven security — reads from DB, not scattered files.
 * §7.5: Full effective decision formula (14 checks).
 */
import { Request, Response, NextFunction } from 'express';
import { evaluateAccess, invalidatePermissionCache, type AccessDecisionContext } from './decision-engine';
import { buildAuthError } from '../contracts/auth-errors';

import {  logger } from '@dos/platform-core/observability';

function deriveModuleCode(permissionCode: string): string {
  const dotIdx = permissionCode.indexOf('.');
  if (dotIdx > 0) return permissionCode.slice(0, dotIdx);
  const colonIdx = permissionCode.indexOf(':');
  if (colonIdx > 0) return permissionCode.slice(0, colonIdx);
  return permissionCode;
}

export { invalidatePermissionCache };

/**
 * Require a specific permission — runs full 14-step decision pipeline.
 *
 * Super-admin bypass: `is_super_admin === true` skips step 8 (role permission check)
 * but all other checks still run (tenant membership, tenant active, module enabled,
 * access profile, SoD, decision logging). Scope-reduction plan: Phase 4 adds audit
 * logging for every super-admin bypass; Phase 5 introduces explicit emergency access.
 */
export function requirePermission(permissionCode: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    const correlationId = req.headers['x-correlation-id'] as string | undefined;
    if (!user) {
      const body = buildAuthError('UNAUTHENTICATED', correlationId);
      res.status(body.status).json(body);
      return;
    }

    const tenantId = req.tenantId;
    if (!tenantId) {
      const body = buildAuthError('TENANT_MEMBERSHIP_MISSING', correlationId);
      res.status(body.status).json(body);
      return;
    }

    const ctx: AccessDecisionContext = {
      userId: user.userId || user.id || '',
      tenantId,
      role: user.role_code || user.role || '',
      roles: (user.roles || (user.role_code ? [user.role_code] : [user.role])).filter((r): r is string => typeof r === 'string' && r.length > 0),
      isSuperAdmin: user.is_super_admin === true,
      permissionCode,
      moduleCode: deriveModuleCode(permissionCode),
      ip: req.ip || req.ip,
      path: req.originalUrl,
    };

    try {
      const decision = await evaluateAccess(ctx);
      if (decision.allowed) {
        next();
      } else {
        const body = buildAuthError('FORBIDDEN', correlationId, {
          failedCheck: decision.failedCheck,
          reason: decision.reason,
          permissionCode,
        });
        res.status(body.status).json(body);
      }
    } catch (err) {
      logger.error('[DAuth] Decision engine error:', err);
      const body = buildAuthError('AUTH_ERROR', correlationId);
      res.status(body.status).json(body);
    }
  };
}

/**
 * Require any of multiple permissions — first one that passes wins.
 */
export function requireAnyPermission(...permissionCodes: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    const correlationId = req.headers['x-correlation-id'] as string | undefined;
    if (!user) {
      const body = buildAuthError('UNAUTHENTICATED', correlationId);
      res.status(body.status).json(body);
      return;
    }

    const tenantId = req.tenantId;
    if (!tenantId) {
      const body = buildAuthError('TENANT_MEMBERSHIP_MISSING', correlationId);
      res.status(body.status).json(body);
      return;
    }

    for (const permissionCode of permissionCodes) {
      const ctx: AccessDecisionContext = {
        userId: user.userId || user.id || '',
        tenantId,
        role: user.role_code || user.role || '',
        roles: (user.roles || (user.role_code ? [user.role_code] : [user.role])).filter((r): r is string => typeof r === 'string' && r.length > 0),
        isSuperAdmin: user.is_super_admin === true,
        permissionCode,
        moduleCode: deriveModuleCode(permissionCode),
        ip: req.ip || req.ip,
        path: req.originalUrl,
      };

      try {
        const decision = await evaluateAccess(ctx);
        if (decision.allowed) { next(); return; }
      } catch {
        // Try next permission
      }
    }

    const body = buildAuthError('FORBIDDEN', correlationId, { required: permissionCodes });
    res.status(body.status).json(body);
  };
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = req.user;
  const correlationId = req.headers['x-correlation-id'] as string | undefined;
  if (!user || user.is_super_admin !== true) {
    const body = buildAuthError('FORBIDDEN', correlationId, { reason: 'Super-admin access required' });
    res.status(body.status).json(body);
    return;
  }
  next();
}

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
export function requireRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    if (!user) { res.status(401).json({ error: 'Not authenticated' }); return; }

    const tenantId = req.tenantId;
    if (!tenantId) { res.status(403).json({ error: 'No tenant context' }); return; }

    const userRole = user.role_code || user.role || '';
    const userRoles: string[] = user.roles || (userRole ? [userRole] : []);

    if (!allowedRoles.some(r => userRoles.includes(r)) && user.is_super_admin !== true) {
      res.status(403).json({ error: 'Insufficient role', required: allowedRoles, code: 'FORBIDDEN' });
      return;
    }

    const ctx: AccessDecisionContext = {
      userId: user.userId || user.id || '',
      tenantId,
      role: userRole,
      roles: userRoles,
      isSuperAdmin: user.is_super_admin === true,
      permissionCode: `platform.role.${allowedRoles[0]}`,
      moduleCode: 'platform',
      ip: req.ip || req.ip,
      path: req.originalUrl,
    };

    try {
      const decision = await evaluateAccess(ctx);
      if (decision.allowed) {
        next();
      } else {
        res.status(403).json({
          error: 'Access denied',
          code: 'FORBIDDEN',
          failedCheck: decision.failedCheck,
          reason: decision.reason,
        });
      }
    } catch (err) {
      logger.error('[DAuth] Decision engine error in requireRole:', err);
      res.status(500).json({ error: 'Authorization service unavailable', code: 'AUTH_ERROR' });
    }
  };
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidatePermissionCache = void 0;
exports.requirePermission = requirePermission;
exports.requireAnyPermission = requireAnyPermission;
exports.requireSuperAdmin = requireSuperAdmin;
exports.requireRole = requireRole;
const decision_engine_1 = require("./decision-engine");
Object.defineProperty(exports, "invalidatePermissionCache", { enumerable: true, get: function () { return decision_engine_1.invalidatePermissionCache; } });
const auth_errors_1 = require("../contracts/auth-errors");
const observability_1 = require("@dos/platform-core/observability");
function deriveModuleCode(permissionCode) {
    const dotIdx = permissionCode.indexOf('.');
    if (dotIdx > 0)
        return permissionCode.slice(0, dotIdx);
    const colonIdx = permissionCode.indexOf(':');
    if (colonIdx > 0)
        return permissionCode.slice(0, colonIdx);
    return permissionCode;
}
/**
 * Require a specific permission — runs full 14-step decision pipeline.
 *
 * Super-admin bypass: `is_super_admin === true` skips step 8 (role permission check)
 * but all other checks still run (tenant membership, tenant active, module enabled,
 * access profile, SoD, decision logging). Scope-reduction plan: Phase 4 adds audit
 * logging for every super-admin bypass; Phase 5 introduces explicit emergency access.
 */
function requirePermission(permissionCode) {
    return async (req, res, next) => {
        const user = req.user;
        const correlationId = req.headers['x-correlation-id'];
        if (!user) {
            const body = (0, auth_errors_1.buildAuthError)('UNAUTHENTICATED', correlationId);
            res.status(body.status).json(body);
            return;
        }
        const tenantId = req.tenantId;
        if (!tenantId) {
            const body = (0, auth_errors_1.buildAuthError)('TENANT_MEMBERSHIP_MISSING', correlationId);
            res.status(body.status).json(body);
            return;
        }
        const ctx = {
            userId: user.userId || user.id || '',
            tenantId,
            role: user.role_code || user.role || '',
            roles: (user.roles || (user.role_code ? [user.role_code] : [user.role])).filter((r) => typeof r === 'string' && r.length > 0),
            isSuperAdmin: user.is_super_admin === true,
            permissionCode,
            moduleCode: deriveModuleCode(permissionCode),
            ip: req.ip || req.ip,
            path: req.originalUrl,
        };
        try {
            const decision = await (0, decision_engine_1.evaluateAccess)(ctx);
            if (decision.allowed) {
                next();
            }
            else {
                const body = (0, auth_errors_1.buildAuthError)('FORBIDDEN', correlationId, {
                    failedCheck: decision.failedCheck,
                    reason: decision.reason,
                    permissionCode,
                });
                res.status(body.status).json(body);
            }
        }
        catch (err) {
            observability_1.logger.error('[DAuth] Decision engine error:', err);
            const body = (0, auth_errors_1.buildAuthError)('AUTH_ERROR', correlationId);
            res.status(body.status).json(body);
        }
    };
}
/**
 * Require any of multiple permissions — first one that passes wins.
 */
function requireAnyPermission(...permissionCodes) {
    return async (req, res, next) => {
        const user = req.user;
        const correlationId = req.headers['x-correlation-id'];
        if (!user) {
            const body = (0, auth_errors_1.buildAuthError)('UNAUTHENTICATED', correlationId);
            res.status(body.status).json(body);
            return;
        }
        const tenantId = req.tenantId;
        if (!tenantId) {
            const body = (0, auth_errors_1.buildAuthError)('TENANT_MEMBERSHIP_MISSING', correlationId);
            res.status(body.status).json(body);
            return;
        }
        for (const permissionCode of permissionCodes) {
            const ctx = {
                userId: user.userId || user.id || '',
                tenantId,
                role: user.role_code || user.role || '',
                roles: (user.roles || (user.role_code ? [user.role_code] : [user.role])).filter((r) => typeof r === 'string' && r.length > 0),
                isSuperAdmin: user.is_super_admin === true,
                permissionCode,
                moduleCode: deriveModuleCode(permissionCode),
                ip: req.ip || req.ip,
                path: req.originalUrl,
            };
            try {
                const decision = await (0, decision_engine_1.evaluateAccess)(ctx);
                if (decision.allowed) {
                    next();
                    return;
                }
            }
            catch {
                // Try next permission
            }
        }
        const body = (0, auth_errors_1.buildAuthError)('FORBIDDEN', correlationId, { required: permissionCodes });
        res.status(body.status).json(body);
    };
}
function requireSuperAdmin(req, res, next) {
    const user = req.user;
    const correlationId = req.headers['x-correlation-id'];
    if (!user || user.is_super_admin !== true) {
        const body = (0, auth_errors_1.buildAuthError)('FORBIDDEN', correlationId, { reason: 'Super-admin access required' });
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
function requireRole(...allowedRoles) {
    return async (req, res, next) => {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }
        const tenantId = req.tenantId;
        if (!tenantId) {
            res.status(403).json({ error: 'No tenant context' });
            return;
        }
        const userRole = user.role_code || user.role || '';
        const userRoles = user.roles || (userRole ? [userRole] : []);
        if (!allowedRoles.some(r => userRoles.includes(r)) && user.is_super_admin !== true) {
            res.status(403).json({ error: 'Insufficient role', required: allowedRoles, code: 'FORBIDDEN' });
            return;
        }
        const ctx = {
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
            const decision = await (0, decision_engine_1.evaluateAccess)(ctx);
            if (decision.allowed) {
                next();
            }
            else {
                res.status(403).json({
                    error: 'Access denied',
                    code: 'FORBIDDEN',
                    failedCheck: decision.failedCheck,
                    reason: decision.reason,
                });
            }
        }
        catch (err) {
            observability_1.logger.error('[DAuth] Decision engine error in requireRole:', err);
            res.status(500).json({ error: 'Authorization service unavailable', code: 'AUTH_ERROR' });
        }
    };
}
//# sourceMappingURL=access.resolver.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = exports.checkBlacklist = void 0;
exports._setBlacklistChecker = _setBlacklistChecker;
exports.authenticate = authenticate;
exports.optionalAuthenticate = optionalAuthenticate;
exports.externalAuthGuard = externalAuthGuard;
exports.scopeGuard = scopeGuard;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const token_service_1 = require("../identity/token.service");
const auth_errors_1 = require("../contracts/auth-errors");
const observability_1 = require("@dos/platform-core/observability");
/**
 * Check if a token JTI is blacklisted (revoked).
 * Delegates to platform token-blacklist service. Fail-closed if unavailable (Law 11).
 * Exported for test injection.
 */
let checkBlacklist = async (jti) => {
    try {
        const { isTokenBlacklisted } = await import('../session/token-blacklist.service.js');
        return isTokenBlacklisted(jti);
    }
    catch (err) {
        const msg = String(err?.message || err);
        if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('connect')) {
            observability_1.logger.warn('[DAuth] token-blacklist table/connection unavailable — allowing token (table may not exist yet)');
            return false;
        }
        observability_1.logger.error('[DAuth] token-blacklist service unavailable — rejecting token (fail-closed)');
        return true;
    }
};
exports.checkBlacklist = checkBlacklist;
/** Override blacklist checker (for testing only). */
function _setBlacklistChecker(fn) {
    exports.checkBlacklist = fn;
}
/**
 * JWT authentication middleware.
 * Verifies Bearer token, checks blacklist, enforces tenant isolation.
 */
async function authenticate(req, res, next) {
    const header = req.headers.authorization;
    const correlationId = req.headers['x-correlation-id'];
    if (!header?.startsWith('Bearer ')) {
        observability_1.logger.warn(`[DAuth] Missing or malformed Authorization header: ${header?.slice(0, 15)}...`);
        const body = (0, auth_errors_1.buildAuthError)('UNAUTHENTICATED', correlationId);
        res.status(body.status).json(body);
        return;
    }
    const token = header.slice(7);
    try {
        const decoded = (0, token_service_1.verifyAccessToken)(token);
        // Check token revocation
        if (decoded.jti) {
            const blacklisted = await (0, exports.checkBlacklist)(decoded.jti);
            if (blacklisted) {
                observability_1.logger.warn(`[DAuth] Token revoked (blacklisted JTI): ${decoded.jti}, user: ${decoded.userId}`);
                const body = (0, auth_errors_1.buildAuthError)('SESSION_REVOKED', correlationId);
                res.status(body.status).json(body);
                return;
            }
        }
        // Enforce password change requirement
        if (decoded.mustChangePassword === true) {
            const url = req.originalUrl || '';
            const isAllowed = url.includes('/auth/change-password') || url.includes('/auth/logout');
            if (!isAllowed) {
                observability_1.logger.warn(`[DAuth] Password change required for user: ${decoded.userId}, path: ${url}`);
                const body = (0, auth_errors_1.buildAuthError)('FORBIDDEN', correlationId, { reason: 'Password change required before accessing this resource' });
                res.status(body.status).json(body);
                return;
            }
        }
        // Enforce tenant isolation
        const resolvedTenantId = req.resolvedTenantId;
        if (resolvedTenantId != null && decoded.tenantId !== resolvedTenantId) {
            observability_1.logger.warn(`[DAuth] Tenant mismatch: JWT=${decoded.tenantId}, Host=${resolvedTenantId}, path: ${req.originalUrl}`);
            const body = (0, auth_errors_1.buildAuthError)('FORBIDDEN', correlationId, { reason: 'Tenant does not match host' });
            res.status(body.status).json(body);
            return;
        }
        // Normalize userId/id for backward compatibility
        if (!decoded.userId && decoded.id) {
            decoded.userId = decoded.id;
        }
        decoded.principalType = decoded.principalType ?? 'human';
        req.user = decoded;
        req.tenantId = resolvedTenantId ?? decoded.tenantId;
        if (!decoded.userId || !decoded.tenantId) {
            observability_1.logger.error(`[DAuth] Incomplete token payload: userId=${decoded.userId}, tenantId=${decoded.tenantId}`);
        }
        next();
    }
    catch (err) {
        observability_1.logger.warn(`[DAuth] Token verification failed: ${err.message || 'Unknown error'}`);
        const isExpired = err?.message?.includes('expired');
        const body = (0, auth_errors_1.buildAuthError)(isExpired ? 'EXPIRED_TOKEN' : 'INVALID_TOKEN', correlationId);
        res.status(body.status).json(body);
    }
}
/** Backward-compatible alias */
exports.authenticateToken = authenticate;
/**
 * Optional auth: if Bearer present, verify and set user/tenantId; otherwise pass through.
 * Use for routes that work both authenticated and unauthenticated.
 * Revoked tokens are rejected even on optional routes to prevent replay attacks.
 */
async function optionalAuthenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        next();
        return;
    }
    const token = header.slice(7);
    const correlationId = req.headers['x-correlation-id'];
    try {
        const decoded = (0, token_service_1.verifyAccessToken)(token);
        // Blacklist check — revoked tokens must not pass even on optional routes
        if (decoded.jti) {
            const blacklisted = await (0, exports.checkBlacklist)(decoded.jti);
            if (blacklisted) {
                observability_1.logger.warn(`[DAuth] Revoked token presented on optional route: ${decoded.jti}, user: ${decoded.userId}`);
                const body = (0, auth_errors_1.buildAuthError)('SESSION_REVOKED', correlationId);
                res.status(body.status).json(body);
                return;
            }
        }
        const resolvedTenantId = req.resolvedTenantId;
        if (resolvedTenantId != null && decoded.tenantId !== resolvedTenantId) {
            const body = (0, auth_errors_1.buildAuthError)('FORBIDDEN', correlationId, { reason: 'Tenant does not match host' });
            res.status(body.status).json(body);
            return;
        }
        decoded.principalType = decoded.principalType ?? 'human';
        req.user = decoded;
        req.tenantId = resolvedTenantId ?? decoded.tenantId;
    }
    catch {
        // Invalid/expired token on optional routes: treat as unauthenticated
    }
    next();
}
/**
 * External auth guard for scoped JWT sessions (vendor portals, regulator portals).
 * Verifies a scoped JWT whose `role` must be one of `allowedRoles`.
 * Sets `req.externalScope` with { tenantId, entityType, entityId, role, permissions }.
 */
function externalAuthGuard(allowedRoles) {
    return (req, res, next) => {
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Missing authorization token' });
            return;
        }
        const token = header.slice(7);
        try {
            const secret = (0, token_service_1.getJwtSecret)();
            const decoded = jsonwebtoken_1.default.verify(token, secret);
            const role = decoded.role;
            if (!role || !allowedRoles.includes(role)) {
                res.status(403).json({ error: `Role '${role}' is not permitted. Allowed: ${allowedRoles.join(', ')}` });
                return;
            }
            req.externalScope = {
                tenantId: decoded.tenantId,
                entityType: decoded.entityType,
                entityId: decoded.entityId,
                role,
                permissions: decoded.permissions ?? [],
            };
            req.tenantId = decoded.tenantId;
            next();
        }
        catch {
            res.status(401).json({ error: 'Invalid or expired token' });
        }
    };
}
/**
 * Scope guard middleware — ensures the external scope matches
 * the requested entity (e.g., organization param matches scope entityId).
 */
function scopeGuard(paramName = 'id') {
    return (req, res, next) => {
        const scope = req.externalScope;
        if (!scope) {
            res.status(401).json({ error: 'No external scope context' });
            return;
        }
        const requested = req.params[paramName];
        if (requested && requested !== scope.entityId) {
            res.status(403).json({ error: 'Access denied: scope mismatch' });
            return;
        }
        next();
    };
}
//# sourceMappingURL=session.middleware.js.map
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCanonicalAuthMiddleware = createCanonicalAuthMiddleware;
exports.requireDauth = requireDauth;
exports.requireOwnershipOf = requireOwnershipOf;
const jwt = __importStar(require("jsonwebtoken"));
const token_verifier_factory_1 = require("./token-verifier-factory");
const authz_evaluator_port_1 = require("./dauth-ports/authz-evaluator.port");
const gateway_origin_1 = require("./gateway-origin");
// Wave 25 — module-scoped replay registry for the best-effort
// gateway-origin role enrichment in authenticate/optionalAuthenticate.
const __WAVE25_REPLAY = (0, gateway_origin_1.createInMemoryReplayRegistry)();
// Wave 25 — role enrichment.
// Keycloak access tokens carry only realm/resource roles (e.g.
// `default-roles-<realm>`). The platform's functional roles
// (`tenant_admin`, etc.) live in `platform_dauth.user_role_assignments`
// and the gateway resolves+signs them into `x-dos-gateway-token`. The
// dauth decision-engine reads `ctx.roles` to look up granted permissions.
// Without this enrichment `ctx.roles` is undefined → permMap.get(undefined)
// → DAUTH_DENY_PERMISSION_MISSING for every functional-role permission.
function enrichDecodedRoles(decoded, req) {
    const merged = new Set();
    // 1) Existing decoded.roles (if any).
    const existing = decoded.roles;
    if (Array.isArray(existing)) {
        for (const r of existing)
            if (typeof r === 'string' && r)
                merged.add(r);
    }
    // 2) Keycloak realm_access.roles
    const realmAccess = decoded.realm_access;
    if (realmAccess && Array.isArray(realmAccess.roles)) {
        for (const r of realmAccess.roles)
            if (typeof r === 'string' && r)
                merged.add(r);
    }
    // 3) Keycloak resource_access.<client>.roles
    const resourceAccess = decoded.resource_access;
    if (resourceAccess && typeof resourceAccess === 'object') {
        for (const entry of Object.values(resourceAccess)) {
            if (entry && Array.isArray(entry.roles)) {
                for (const r of entry.roles)
                    if (typeof r === 'string' && r)
                        merged.add(r);
            }
        }
    }
    // 4) Gateway-origin signed token — DB-resolved functional roles.
    //    Verified with HMAC; failures are silently ignored (best-effort
    //    enrichment; the authenticate gate has already accepted the
    //    Keycloak JWT).
    const gwToken = req.headers[gateway_origin_1.GATEWAY_ORIGIN_HEADER];
    const secret = process.env.GATEWAY_ORIGIN_HMAC_SECRET;
    if (gwToken && secret && secret.length >= 32) {
        try {
            const result = (0, gateway_origin_1.verifyGatewayOrigin)(gwToken, { secret, replayRegistry: __WAVE25_REPLAY });
            if (result.ok && Array.isArray(result.principal.roles)) {
                for (const r of result.principal.roles)
                    if (typeof r === 'string' && r)
                        merged.add(r);
            }
        }
        catch {
            // ignore — keep enrichment best-effort
        }
    }
    // 5) Legacy `x-user-roles` header — only honored when LEGACY_HEADER_TRUST
    //    is on (matches gateway-origin middleware semantics).
    const legacyTrust = (process.env.LEGACY_HEADER_TRUST ?? 'true').toLowerCase();
    if (legacyTrust !== 'false' && legacyTrust !== '0' && legacyTrust !== 'no') {
        const raw = req.headers['x-user-roles'];
        if (typeof raw === 'string' && raw) {
            for (const r of raw.split(',').map((s) => s.trim()).filter(Boolean))
                merged.add(r);
        }
    }
    if (merged.size > 0)
        decoded.roles = Array.from(merged);
}
function readBool(envKey) {
    const v = process.env[envKey];
    if (!v)
        return false;
    const low = v.toLowerCase();
    return low === '1' || low === 'true';
}
/** Decode header without verification to inspect the `alg` field. */
function peekAlg(token) {
    try {
        const decoded = jwt.decode(token, { complete: true });
        return decoded?.header?.alg ?? 'unknown';
    }
    catch {
        return 'unknown';
    }
}
// ── Secret resolution (same logic as auth-service token.service.ts) ──
let _cachedSecret = null;
function defaultGetSecret() {
    if (_cachedSecret)
        return _cachedSecret;
    const secret = process.env.JWT_SECRET;
    if (secret) {
        _cachedSecret = secret;
        return secret;
    }
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        _cachedSecret = 'dev-secret';
        return _cachedSecret;
    }
    throw new Error('[DOS-AUTH] JWT_SECRET environment variable is required');
}
// ── Blacklist — lazy-load from @dos/db if available ──
let _blacklistFn = null;
async function defaultIsBlacklisted(jti) {
    if (_blacklistFn)
        return _blacklistFn(jti);
    try {
        // Attempt to resolve token-blacklist via @dos/db + direct SQL
        const { safeQuery } = require('@dos/db');
        _blacklistFn = async (j) => {
            try {
                const result = await safeQuery('SELECT 1 FROM token_blacklist WHERE jti = $1 AND expires_at > NOW() AND COALESCE(is_active, FALSE) = FALSE LIMIT 1', [j]);
                return result.rows.length > 0;
            }
            catch (err) {
                const msg = String(err?.message || err);
                // Infrastructure errors — allow the token (graceful degradation).
                // Services may lack SELECT on token_blacklist; that's expected
                // for non-auth services using shared middleware.
                if (msg.includes('does not exist') ||
                    msg.includes('relation') ||
                    msg.includes('connect') ||
                    msg.includes('permission denied') ||
                    msg.includes('insufficient privilege')) {
                    return false;
                }
                // Unknown error — log and fail-open (a single DB hiccup must not
                // lock out every user across the platform).
                const svcCode = process.env.SERVICE_CODE || 'unknown';
                console.warn(`[${svcCode}] blacklist check error for jti=${j.slice(0, 8)}…: ${msg.slice(0, 120)}`);
                return false;
            }
        };
        return _blacklistFn(jti);
    }
    catch {
        // @dos/db not available — skip blacklist check
        _blacklistFn = async () => false;
        return false;
    }
}
// ── Factory ──
function createCanonicalAuthMiddleware(opts) {
    const getSecret = opts?.getSecret ?? defaultGetSecret;
    const isBlacklisted = opts?.isBlacklisted ?? defaultIsBlacklisted;
    /**
     * Port-aware verify. Resolves the TokenVerifier stack lazily per request
     * because `bootstrapDauth()` runs AFTER `createCanonicalAuthMiddleware()`
     * in every service's boot sequence — resolving at factory construction
     * would pin the stack to "uninitialised" forever.
     */
    async function verifyViaPortOrFallback(token) {
        const alg = peekAlg(token);
        try {
            const stack = (0, token_verifier_factory_1.getTokenVerifier)();
            const primaryResult = await stack.primary.verify(token);
            // Fire shadow verification best-effort; never block the request.
            if (stack.shadow) {
                stack.shadow
                    .verify(token)
                    .then((shadowResult) => {
                    if (shadowResult.source !== primaryResult.source) {
                        // Divergence telemetry only; decision-log write happens upstream
                        // in writeAuthDecision. Keep this log low-noise.
                        const svc = process.env.SERVICE_CODE || 'unknown';
                        console.warn(`[${svc}] token shadow diverged primary=${primaryResult.source} shadow=${shadowResult.source}`);
                    }
                })
                    .catch(() => { });
            }
            return {
                decoded: primaryResult.payload,
                alg,
                source: primaryResult.source,
            };
        }
        catch (err) {
            // If the factory itself is uninitialised, fall through to HS256 direct
            // verification below. This preserves the legacy path for services that
            // load the middleware before `bootstrapDauth` runs.
            const msg = err?.message ?? '';
            const factoryUninit = msg.includes('initTokenVerifierFactory');
            if (!factoryUninit) {
                // A real verification error — re-throw so the caller emits 401.
                throw err;
            }
        }
        // Fallback path — only reached when the factory was never initialised.
        const decoded = jwt.verify(token, getSecret());
        return { decoded, alg, source: 'fallback-hs256' };
    }
    /**
     * Legacy-token kill-switch. When ENFORCE=true and the verified token is
     * HS256 AND `DAUTH_ACCEPT_NATIVE_HS256` is not `true`, reject. This cuts
     * over all live sessions to Keycloak RS256 at flip time.
     */
    function legacyTokenRejected(v) {
        const enforce = readBool('DAUTH_KEYCLOAK_ENFORCE');
        if (!enforce)
            return false;
        const acceptLegacy = readBool('DAUTH_ACCEPT_NATIVE_HS256');
        if (acceptLegacy)
            return false;
        return v.alg === 'HS256';
    }
    /**
     * Extract the access token from the request. Prefers the
     * `Authorization: Bearer …` header (used by service-to-service callers
     * and legacy mobile clients) and falls back to the
     * `dos_access_token` httpOnly cookie set by the OIDC callback. The
     * cookie path was added so the SPA no longer has to receive the token
     * via a `?token=…` redirect query string — see
     * `setAccessTokenCookie` in services/auth-service/src/domain/identity/token.service.ts.
     */
    function extractBearerToken(req) {
        const header = req.headers.authorization;
        if (header?.startsWith('Bearer ') && header.length > 7) {
            return header.slice(7);
        }
        const cookieJar = req.cookies;
        const fromCookie = cookieJar?.['dos_access_token'];
        return fromCookie && fromCookie.length > 0 ? fromCookie : null;
    }
    // ── authenticate ──
    const authenticate = async (req, res, next) => {
        const token = extractBearerToken(req);
        if (!token) {
            res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
            return;
        }
        try {
            const verified = await verifyViaPortOrFallback(token);
            if (legacyTokenRejected(verified)) {
                res.status(401).json({
                    error: 'Legacy HS256 token rejected — re-authenticate via Keycloak',
                    code: 'LEGACY_TOKEN_REJECTED',
                });
                return;
            }
            const decoded = verified.decoded;
            // Blacklist check
            const jti = decoded.jti;
            if (jti) {
                const revoked = await isBlacklisted(jti);
                if (revoked) {
                    res.status(401).json({ error: 'Session revoked', code: 'SESSION_REVOKED' });
                    return;
                }
            }
            // Enforce password change requirement
            if (decoded.mustChangePassword === true) {
                const url = req.originalUrl || '';
                const isAllowed = url.includes('/auth/change-password') || url.includes('/auth/logout');
                if (!isAllowed) {
                    res.status(403).json({ error: 'Password change required before accessing this resource', code: 'PASSWORD_CHANGE_REQUIRED' });
                    return;
                }
            }
            // Enforce tenant isolation
            const resolvedTenantId = req.resolvedTenantId;
            if (resolvedTenantId != null && decoded.tenantId !== resolvedTenantId) {
                res.status(403).json({ error: 'Tenant does not match host', code: 'TENANT_MISMATCH' });
                return;
            }
            // Normalize userId
            if (!decoded.userId && decoded.id)
                decoded.userId = decoded.id;
            decoded.principalType = decoded.principalType ?? 'human';
            // Wave 25 — merge functional roles from gateway-origin token + Keycloak
            // realm/resource access into decoded.roles so the dauth decision-engine
            // can resolve permissions through `platform_dauth.role_permission_map`.
            enrichDecodedRoles(decoded, req);
            req.user = decoded;
            req.tenantId = (resolvedTenantId ?? decoded.tenantId);
            next();
        }
        catch (err) {
            const isExpired = err?.message?.includes('expired');
            res.status(401).json({
                error: isExpired ? 'Token expired' : 'Invalid or expired token',
                code: isExpired ? 'EXPIRED_TOKEN' : 'INVALID_TOKEN',
            });
        }
    };
    // ── optionalAuthenticate ──
    const optionalAuthenticate = async (req, res, next) => {
        const token = extractBearerToken(req);
        if (!token) {
            next();
            return;
        }
        try {
            const verified = await verifyViaPortOrFallback(token);
            if (legacyTokenRejected(verified)) {
                // On optional routes we still reject legacy tokens when ENFORCE is on
                // — it's a signal that the caller is stuck on a pre-cutover session
                // and must re-auth before any authenticated feature works.
                res.status(401).json({
                    error: 'Legacy HS256 token rejected — re-authenticate via Keycloak',
                    code: 'LEGACY_TOKEN_REJECTED',
                });
                return;
            }
            const decoded = verified.decoded;
            const jti = decoded.jti;
            if (jti) {
                const revoked = await isBlacklisted(jti);
                if (revoked) {
                    res.status(401).json({ error: 'Session revoked', code: 'SESSION_REVOKED' });
                    return;
                }
            }
            const resolvedTenantId = req.resolvedTenantId;
            if (resolvedTenantId != null && decoded.tenantId !== resolvedTenantId) {
                res.status(403).json({ error: 'Tenant does not match host', code: 'TENANT_MISMATCH' });
                return;
            }
            if (!decoded.userId && decoded.id)
                decoded.userId = decoded.id;
            decoded.principalType = decoded.principalType ?? 'human';
            // Wave 25 — same enrichment as authenticate (functional roles).
            enrichDecodedRoles(decoded, req);
            req.user = decoded;
            req.tenantId = (resolvedTenantId ?? decoded.tenantId);
        }
        catch {
            // Invalid/expired token on optional routes — treat as unauthenticated
        }
        next();
    };
    // ── helpers ──
    function buildEvalContext(req, permission) {
        const user = req.user;
        if (!user)
            return null;
        const correlationId = req.headers['x-correlation-id'] ??
            req.headers['x-request-id'];
        return {
            userId: (user.userId ?? user.id ?? ''),
            tenantId: (req.tenantId ?? user.tenantId ?? ''),
            role: (user.role ?? ''),
            roles: user.roles ?? undefined,
            isSuperAdmin: user.is_super_admin === true || user.isSuperAdmin === true,
            permissionCode: permission,
            ip: req.ip,
            path: req.path,
            attributes: { permissions: user.permissions ?? [] },
            correlationId,
        };
    }
    function shortCircuitOwnerOrAdmin(user) {
        if (user.is_super_admin === true || user.isSuperAdmin === true)
            return true;
        if (user.role === 'owner' || user.is_tenant_owner === true || user.isTenantOwner === true)
            return true;
        return false;
    }
    function denyResponse(res, verdict, fallbackMsg) {
        const status = verdict.decision === 'pending_approval' ? 202 : 403;
        res.status(status).json({
            error: verdict.reason ?? fallbackMsg,
            code: verdict.reasonCode ?? 'FORBIDDEN',
            decision: verdict.decision,
            correlationId: verdict.correlationId,
            source: verdict.source,
        });
    }
    // ── requirePermission ──
    // Builds an AuthzEvaluationContext from the request and delegates the
    // decision to the registered evaluator port. The default port is a
    // legacy JWT-claim wildcard match (preserves prior behavior); when
    // dauth-core's bootstrap registers its native evaluator, this becomes
    // the entry point to the full 14-step pipeline (membership, ABAC, SoD,
    // ReBAC, delegation, lifecycle, ledger write).
    function requirePermission(permission) {
        return async (req, res, next) => {
            const user = req.user;
            if (!user) {
                res.status(401).json({ error: 'Authentication required', code: 'NO_AUTH' });
                return;
            }
            // Owner / super-admin fast path — short-circuits before the evaluator
            // for parity with the original middleware. Native evaluator still
            // logs these via its own super-admin step when invoked directly.
            if (shortCircuitOwnerOrAdmin(user)) {
                next();
                return;
            }
            const ctx = buildEvalContext(req, permission);
            if (!ctx) {
                res.status(401).json({ error: 'Authentication required', code: 'NO_AUTH' });
                return;
            }
            try {
                const verdict = await (0, authz_evaluator_port_1.getAuthzEvaluator)().evaluate(ctx);
                if (verdict.decision === 'allow') {
                    next();
                    return;
                }
                denyResponse(res, verdict, `Insufficient permissions. Required: ${permission}`);
            }
            catch (err) {
                // Hard-fail closed: any evaluator error is a deny, never a leak.
                res.status(503).json({
                    error: 'Authorization evaluator failed',
                    code: 'AUTHZ_EVALUATOR_ERROR',
                    detail: err instanceof Error ? err.message : 'unknown',
                });
            }
        };
    }
    // ── requireAnyPermission ──
    // Calls the evaluator once per candidate permission and allows on the
    // first `allow`. Short-circuits on owner/super-admin like requirePermission.
    function requireAnyPermission(...permissions) {
        return async (req, res, next) => {
            const user = req.user;
            if (!user) {
                res.status(401).json({ error: 'Authentication required', code: 'NO_AUTH' });
                return;
            }
            if (shortCircuitOwnerOrAdmin(user)) {
                next();
                return;
            }
            const evaluator = (0, authz_evaluator_port_1.getAuthzEvaluator)();
            let lastVerdict = null;
            try {
                for (const perm of permissions) {
                    const ctx = buildEvalContext(req, perm);
                    if (!ctx) {
                        res.status(401).json({ error: 'Authentication required', code: 'NO_AUTH' });
                        return;
                    }
                    const verdict = await evaluator.evaluate(ctx);
                    if (verdict.decision === 'allow') {
                        next();
                        return;
                    }
                    lastVerdict = verdict;
                }
                if (lastVerdict) {
                    denyResponse(res, lastVerdict, `Insufficient permissions. Required one of: ${permissions.join(' | ')}`);
                }
                else {
                    res.status(403).json({ error: 'No permissions specified', code: 'FORBIDDEN' });
                }
            }
            catch (err) {
                res.status(503).json({
                    error: 'Authorization evaluator failed',
                    code: 'AUTHZ_EVALUATOR_ERROR',
                    detail: err instanceof Error ? err.message : 'unknown',
                });
            }
        };
    }
    // ── requireSuperAdmin ──
    const requireSuperAdmin = (req, res, next) => {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Authentication required', code: 'NO_AUTH' });
            return;
        }
        if (user.is_super_admin !== true) {
            res.status(403).json({ error: 'Super admin access required', code: 'NOT_SUPER_ADMIN' });
            return;
        }
        next();
    };
    return {
        authenticate,
        optionalAuthenticate,
        requirePermission,
        requireAnyPermission,
        requireSuperAdmin,
    };
}
/**
 * `requireDauth(...)` — explicit-context authorization middleware.
 *
 * Usage:
 *   router.post('/policies/:id/approve',
 *     authenticate,
 *     requireTenantId,
 *     requireDauth({
 *       permission: 'policy.record.approve',
 *       moduleCode: 'policy',
 *       entityType: 'policy',
 *       entityIdParam: 'id',
 *       lifecycleFromState: 'submitted',
 *       lifecycleToState: 'approved',
 *       authorityRequired: 'L2',
 *     }),
 *     handler);
 *
 * The evaluator port resolves at request time, so services that load
 * dauth-core get the full 14-step pipeline; services that don't get the
 * legacy fallback. Same fail-closed behavior as `requirePermission`.
 */
function requireDauth(opts) {
    return async (req, res, next) => {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Authentication required', code: 'NO_AUTH' });
            return;
        }
        // Super-admin / owner short-circuit consistent with requirePermission.
        if (user.is_super_admin === true || user.isSuperAdmin === true) {
            next();
            return;
        }
        if (user.role === 'owner' || user.is_tenant_owner === true || user.isTenantOwner === true) {
            next();
            return;
        }
        const correlationId = req.headers['x-correlation-id'] ??
            req.headers['x-request-id'];
        const entityId = opts.entityIdParam && req.params ? req.params[opts.entityIdParam] : undefined;
        const ctx = {
            userId: (user.userId ?? user.id ?? ''),
            tenantId: (req.tenantId ?? user.tenantId ?? ''),
            role: (user.role ?? ''),
            roles: user.roles ?? undefined,
            isSuperAdmin: false,
            permissionCode: opts.permission,
            moduleCode: opts.moduleCode,
            entityType: opts.entityType,
            entityId,
            authorityRequired: opts.authorityRequired,
            lifecycleFromState: opts.lifecycleFromState,
            lifecycleToState: opts.lifecycleToState,
            ip: req.ip,
            path: req.path,
            attributes: {
                ...(opts.attributes ?? {}),
                permissions: user.permissions ?? [],
            },
            correlationId,
        };
        try {
            const verdict = await (0, authz_evaluator_port_1.getAuthzEvaluator)().evaluate(ctx);
            if (verdict.decision === 'allow') {
                next();
                return;
            }
            const status = verdict.decision === 'pending_approval' ? 202 : 403;
            res.status(status).json({
                error: verdict.reason ?? `Insufficient permissions. Required: ${opts.permission}`,
                code: verdict.reasonCode ?? 'FORBIDDEN',
                decision: verdict.decision,
                correlationId: verdict.correlationId,
                source: verdict.source,
            });
        }
        catch (err) {
            res.status(503).json({
                error: 'Authorization evaluator failed',
                code: 'AUTHZ_EVALUATOR_ERROR',
                detail: err instanceof Error ? err.message : 'unknown',
            });
        }
    };
}
/**
 * `requireOwnershipOf(...)` — convenience wrapper that pre-fills
 * `ownershipRequired: true` so the evaluator's ABAC step enforces
 * actor-must-own-entity. The native evaluator reads ownership from
 * `dos.ownership_mappings` (Foundation) and the entity's owner column.
 */
function requireOwnershipOf(opts) {
    return async (req, res, next) => {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Authentication required', code: 'NO_AUTH' });
            return;
        }
        if (user.is_super_admin === true || user.isSuperAdmin === true) {
            next();
            return;
        }
        if (user.role === 'owner' || user.is_tenant_owner === true || user.isTenantOwner === true) {
            next();
            return;
        }
        const correlationId = req.headers['x-correlation-id'] ??
            req.headers['x-request-id'];
        const ctx = {
            userId: (user.userId ?? user.id ?? ''),
            tenantId: (req.tenantId ?? user.tenantId ?? ''),
            role: (user.role ?? ''),
            roles: user.roles ?? undefined,
            permissionCode: opts.permission,
            moduleCode: opts.moduleCode,
            entityType: opts.entityType,
            entityId: req.params?.[opts.entityIdParam],
            ownershipRequired: true,
            ip: req.ip,
            path: req.path,
            attributes: { permissions: user.permissions ?? [] },
            correlationId,
        };
        try {
            const verdict = await (0, authz_evaluator_port_1.getAuthzEvaluator)().evaluate(ctx);
            if (verdict.decision === 'allow') {
                next();
                return;
            }
            res.status(403).json({
                error: verdict.reason ?? 'Ownership required',
                code: verdict.reasonCode ?? 'NOT_OWNER',
                decision: verdict.decision,
                correlationId: verdict.correlationId,
                source: verdict.source,
            });
        }
        catch (err) {
            res.status(503).json({
                error: 'Authorization evaluator failed',
                code: 'AUTHZ_EVALUATOR_ERROR',
                detail: err instanceof Error ? err.message : 'unknown',
            });
        }
    };
}
//# sourceMappingURL=canonical-middleware.js.map
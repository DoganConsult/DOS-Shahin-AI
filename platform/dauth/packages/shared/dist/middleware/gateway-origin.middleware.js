"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireGatewayOrigin = requireGatewayOrigin;
const gateway_origin_1 = require("../gateway-origin");
const DEFAULT_REPLAY = (0, gateway_origin_1.createInMemoryReplayRegistry)();
function legacyHeadersToPrincipal(req) {
    const sub = req.headers['x-user-sub']
        ?? req.headers['x-user-id'];
    if (!sub)
        return null;
    const email = req.headers['x-user-email'] ?? '';
    const tenantId = req.headers['x-tenant-id'] ?? '';
    const rolesRaw = req.headers['x-user-roles'];
    const roles = rolesRaw ? rolesRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];
    return { sub, tenantId, email, roles };
}
function requireGatewayOrigin(options = {}) {
    const resolveSecret = options.resolveSecret ?? (() => {
        const s = process.env.GATEWAY_ORIGIN_HMAC_SECRET;
        if (!s) {
            throw new Error('[gateway-origin] GATEWAY_ORIGIN_HMAC_SECRET is not set');
        }
        return s;
    });
    const resolveLegacyTrust = options.resolveLegacyTrust ?? (() => {
        const v = (process.env.LEGACY_HEADER_TRUST ?? 'true').toLowerCase();
        return v !== 'false' && v !== '0' && v !== 'no';
    });
    const replayRegistry = options.replayRegistry ?? DEFAULT_REPLAY;
    const clockSkew = options.clockSkewSeconds
        ?? (process.env.GATEWAY_ORIGIN_CLOCK_SKEW_S ? Number(process.env.GATEWAY_ORIGIN_CLOCK_SKEW_S) : 5);
    const log = options.logger ?? {
        info: (m, meta) => console.info(m, meta ?? ''),
        warn: (m, meta) => console.warn(m, meta ?? ''),
    };
    return (req, res, next) => {
        const rawToken = req.headers[gateway_origin_1.GATEWAY_ORIGIN_HEADER];
        const legacy = resolveLegacyTrust();
        if (!rawToken) {
            if (!legacy) {
                res.status(401).json({ error: 'GATEWAY_ORIGIN_REQUIRED', code: 'MISSING_GATEWAY_TOKEN' });
                return;
            }
            // Legacy fallback (Wave 1 rollout in progress).
            const p = legacyHeadersToPrincipal(req);
            if (!p) {
                res.status(401).json({ error: 'NO_CALLER', code: 'MISSING_PRINCIPAL' });
                return;
            }
            log.warn('[gateway-origin] LEGACY_HEADER_TRUST fallback', {
                path: req.originalUrl,
                sub: p.sub,
            });
            req.principal = p;
            // Sync legacy fields for code that hasn't been migrated yet.
            req.tenantId = p.tenantId || req.tenantId;
            next();
            return;
        }
        let secret;
        try {
            secret = resolveSecret();
        }
        catch (err) {
            log.warn('[gateway-origin] secret resolution failed', err);
            res.status(500).json({ error: 'CONFIG_ERROR', code: 'NO_GATEWAY_SECRET' });
            return;
        }
        const result = (0, gateway_origin_1.verifyGatewayOrigin)(rawToken, {
            secret,
            replayRegistry,
            clockSkewSeconds: clockSkew,
        });
        if (!result.ok) {
            const failure = result;
            log.warn('[gateway-origin] verification failed', {
                reason: failure.reason,
                path: req.originalUrl,
            });
            res.status(401).json({ error: 'GATEWAY_ORIGIN_INVALID', code: failure.reason });
            return;
        }
        req.principal = result.principal;
        // Back-compat for code that reads `req.tenantId` and `req.user`.
        req.tenantId = result.principal.tenantId || undefined;
        if (!req.user) {
            // Minimal user shape consumers expect; full user resolution still
            // happens via `authenticate` for protected routes that need DB user.
            req.user = {
                userId: result.principal.sub,
                email: result.principal.email,
                roles: result.principal.roles,
                // role/role_code intentionally undefined — permission checks must
                // not rely on the gateway-origin token alone for role mapping.
            };
        }
        next();
    };
}
//# sourceMappingURL=gateway-origin.middleware.js.map
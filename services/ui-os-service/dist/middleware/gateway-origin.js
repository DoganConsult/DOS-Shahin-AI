import crypto from 'node:crypto';
export const GATEWAY_ORIGIN_HEADER = 'x-dos-gateway-token';
function base64UrlDecode(s) {
    const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
    return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}
function timingSafeEq(a, b) {
    if (a.length !== b.length)
        return false;
    return crypto.timingSafeEqual(a, b);
}
function createReplayRegistry() {
    const max = 10_000;
    const seenMap = new Map();
    return {
        seen(jti, expEpochSeconds, nowSeconds) {
            const cutoff = nowSeconds ?? Math.floor(Date.now() / 1000);
            if (seenMap.size > max) {
                for (const [k, v] of seenMap)
                    if (v < cutoff)
                        seenMap.delete(k);
                while (seenMap.size > max) {
                    const first = seenMap.keys().next().value;
                    if (first === undefined)
                        break;
                    seenMap.delete(first);
                }
            }
            const prev = seenMap.get(jti);
            if (prev !== undefined && prev >= cutoff)
                return true;
            seenMap.set(jti, expEpochSeconds);
            return false;
        },
    };
}
const DEFAULT_REPLAY = createReplayRegistry();
export function verifyGatewayOrigin(rawToken, options) {
    if (!rawToken)
        return { ok: false, reason: 'MISSING' };
    const dot = rawToken.indexOf('.');
    if (dot <= 0 || dot === rawToken.length - 1)
        return { ok: false, reason: 'MALFORMED' };
    const payloadB64 = rawToken.slice(0, dot);
    const sigB64 = rawToken.slice(dot + 1);
    const expectedSig = crypto.createHmac('sha256', options.secret).update(payloadB64).digest();
    let providedSig;
    try {
        providedSig = base64UrlDecode(sigB64);
    }
    catch {
        return { ok: false, reason: 'MALFORMED' };
    }
    if (!timingSafeEq(providedSig, expectedSig))
        return { ok: false, reason: 'BAD_HMAC' };
    let payload;
    try {
        payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8'));
    }
    catch {
        return { ok: false, reason: 'MALFORMED' };
    }
    if (typeof payload !== 'object' || payload === null
        || typeof payload.sub !== 'string' || payload.sub.length === 0
        || typeof payload.email !== 'string'
        || typeof payload.iat !== 'number' || typeof payload.exp !== 'number'
        || typeof payload.jti !== 'string' || payload.jti.length === 0
        || !Array.isArray(payload.roles)
        || typeof payload.tenantId !== 'string')
        return { ok: false, reason: 'PAYLOAD_INVALID' };
    if (payload.src !== 'gateway')
        return { ok: false, reason: 'WRONG_SOURCE' };
    if (payload.v !== 1)
        return { ok: false, reason: 'WRONG_VERSION' };
    const skew = options.clockSkewSeconds ?? 5;
    const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
    if (now > payload.exp + skew)
        return { ok: false, reason: 'EXPIRED' };
    if (now + skew < payload.iat)
        return { ok: false, reason: 'NOT_YET_VALID' };
    const replay = options.replayRegistry ?? DEFAULT_REPLAY;
    if (replay.seen(payload.jti, payload.exp, now))
        return { ok: false, reason: 'REPLAYED' };
    return {
        ok: true,
        payload,
        principal: { sub: payload.sub, tenantId: payload.tenantId, email: payload.email, roles: payload.roles },
    };
}
/**
 * Pin `req.principal` from the verified gateway-origin token.
 *
 * Dual mode (Wave 1 rollout):
 *   - LEGACY_HEADER_TRUST=true  → MISSING token falls back to raw
 *     `x-user-*` / `x-tenant-id` headers (preserves pre-Wave-1 behavior).
 *   - LEGACY_HEADER_TRUST=false → MISSING token returns 401.
 *
 * In BOTH modes, present-but-invalid tokens (bad HMAC, expired, replayed,
 * malformed) return 401. The flag only controls the missing-token branch.
 */
export function requireGatewayOrigin(opts = {}) {
    const resolveSecret = opts.resolveSecret ?? (() => {
        const s = process.env.GATEWAY_ORIGIN_HMAC_SECRET;
        if (!s)
            throw new Error('[gateway-origin] GATEWAY_ORIGIN_HMAC_SECRET not set');
        return s;
    });
    const resolveLegacyTrust = opts.resolveLegacyTrust ?? (() => {
        const v = (process.env.LEGACY_HEADER_TRUST ?? 'true').toLowerCase();
        return v !== 'false' && v !== '0' && v !== 'no';
    });
    const replayRegistry = opts.replayRegistry ?? DEFAULT_REPLAY;
    return (req, res, next) => {
        const rawToken = req.headers[GATEWAY_ORIGIN_HEADER];
        const legacy = resolveLegacyTrust();
        if (!rawToken) {
            if (!legacy) {
                res.status(401).json({ error: 'GATEWAY_ORIGIN_REQUIRED', code: 'MISSING_GATEWAY_TOKEN' });
                return;
            }
            const sub = req.headers['x-user-sub']
                ?? req.headers['x-user-id'];
            if (!sub) {
                res.status(401).json({ error: 'NO_CALLER', code: 'MISSING_PRINCIPAL' });
                return;
            }
            const email = req.headers['x-user-email'] ?? '';
            const tenantId = req.headers['x-tenant-id'] ?? '';
            const rolesRaw = req.headers['x-user-roles'];
            const roles = rolesRaw ? rolesRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];
            console.warn('[gateway-origin] LEGACY_HEADER_TRUST fallback', { path: req.originalUrl, sub });
            req.principal = { sub, tenantId, email, roles };
            next();
            return;
        }
        let secret;
        try {
            secret = resolveSecret();
        }
        catch (err) {
            console.warn('[gateway-origin] secret resolution failed', err.message);
            res.status(500).json({ error: 'CONFIG_ERROR', code: 'NO_GATEWAY_SECRET' });
            return;
        }
        const result = verifyGatewayOrigin(rawToken, { secret, replayRegistry });
        if (result.ok !== true) {
            // Narrow to the failure branch explicitly. (`if (!result.ok)` confuses
            // TS narrowing under our base `"strictNullChecks": false` config.)
            const failed = result;
            console.warn('[gateway-origin] verification failed', { reason: failed.reason, path: req.originalUrl });
            res.status(401).json({ error: 'GATEWAY_ORIGIN_INVALID', code: failed.reason });
            return;
        }
        req.principal = result.principal;
        next();
    };
}
//# sourceMappingURL=gateway-origin.js.map
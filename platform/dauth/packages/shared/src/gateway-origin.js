"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GATEWAY_ORIGIN_HEADER = exports.STRIPPED_INBOUND_HEADERS = void 0;
exports.signGatewayOrigin = signGatewayOrigin;
exports.verifyGatewayOrigin = verifyGatewayOrigin;
exports.createInMemoryReplayRegistry = createInMemoryReplayRegistry;
/**
 * Gateway-origin trust mechanism (Wave 1).
 *
 * Canonical contract: the API gateway is the SOLE entry path that may
 * inject identity/tenant headers. Downstream services MUST verify a
 * cryptographic origin token before reading any identity. Without this,
 * a request that bypasses the gateway can spoof `x-user-sub` /
 * `x-tenant-id` and impersonate any tenant.
 *
 * Token shape: `<base64url(payload-json)>.<base64url(hmac-sha256)>`
 * Header:      `x-dos-gateway-token`
 *
 * - HMAC-SHA-256 over `base64url(payload-json)` using a secret pulled
 *   from `GATEWAY_ORIGIN_HMAC_SECRET` (≥ 32 bytes).
 * - Short TTL (60s by default). Replay-bounded by per-service in-memory
 *   `jti` LRU window.
 * - Downstream code reads `req.principal` populated from the verified
 *   payload. The raw `x-user-*` / `x-tenant-id` headers are advisory in
 *   dual mode and ignored entirely once `LEGACY_HEADER_TRUST=false`.
 *
 * No frontend code, no test code, and no service may import jsonwebtoken
 * here — gateway-origin uses HMAC-SHA-256 only and avoids the JWT-claim
 * complexity surface (we already verify Keycloak RS256 separately).
 */
const node_crypto_1 = __importDefault(require("node:crypto"));
// ── Encoding helpers ───────────────────────────────────────────────────────
function base64UrlEncode(buf) {
    return buf.toString('base64')
        .replace(/=+$/, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}
function base64UrlDecode(s) {
    const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
    return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}
function timingSafeEq(a, b) {
    if (a.length !== b.length)
        return false;
    return node_crypto_1.default.timingSafeEqual(a, b);
}
function signGatewayOrigin(input, secret) {
    if (!secret || secret.length < 32) {
        throw new Error('[gateway-origin] secret must be ≥ 32 chars');
    }
    if (!input.sub)
        throw new Error('[gateway-origin] sub is required');
    if (!input.email)
        throw new Error('[gateway-origin] email is required');
    const ttl = Math.min(Math.max(input.ttlSeconds ?? 60, 5), 300);
    const iat = input.nowSeconds ?? Math.floor(Date.now() / 1000);
    const payload = {
        iat,
        exp: iat + ttl,
        jti: input.jti ?? node_crypto_1.default.randomUUID(),
        sub: input.sub,
        tenantId: input.tenantId ?? '',
        email: input.email,
        roles: input.roles ?? [],
        src: 'gateway',
        v: 1,
    };
    const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload), 'utf8'));
    const sig = node_crypto_1.default.createHmac('sha256', secret).update(payloadB64).digest();
    return `${payloadB64}.${base64UrlEncode(sig)}`;
}
function verifyGatewayOrigin(rawToken, options) {
    if (!rawToken)
        return { ok: false, reason: 'MISSING' };
    const dot = rawToken.indexOf('.');
    if (dot <= 0 || dot === rawToken.length - 1) {
        return { ok: false, reason: 'MALFORMED' };
    }
    const payloadB64 = rawToken.slice(0, dot);
    const sigB64 = rawToken.slice(dot + 1);
    const expectedSig = node_crypto_1.default
        .createHmac('sha256', options.secret)
        .update(payloadB64)
        .digest();
    let providedSig;
    try {
        providedSig = base64UrlDecode(sigB64);
    }
    catch {
        return { ok: false, reason: 'MALFORMED' };
    }
    if (!timingSafeEq(providedSig, expectedSig)) {
        return { ok: false, reason: 'BAD_HMAC' };
    }
    let payload;
    try {
        const json = base64UrlDecode(payloadB64).toString('utf8');
        payload = JSON.parse(json);
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
        || typeof payload.tenantId !== 'string') {
        return { ok: false, reason: 'PAYLOAD_INVALID' };
    }
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
    // Replay check — the registry guarantees that a jti seen within the
    // verifier's window is rejected. We pass the verifier's `now` so the
    // registry's GC uses the same clock as the freshness checks above —
    // critical when tests inject a fixed clock and when wall-clock skew
    // would otherwise expire entries the verifier still considers fresh.
    const seen = options.replayRegistry.seen(payload.jti, payload.exp, now);
    if (seen)
        return { ok: false, reason: 'REPLAYED' };
    return {
        ok: true,
        payload,
        principal: {
            sub: payload.sub,
            tenantId: payload.tenantId,
            email: payload.email,
            roles: payload.roles,
        },
    };
}
function createInMemoryReplayRegistry(opts) {
    const max = opts?.maxEntries ?? 10_000;
    const fallbackNow = opts?.nowSeconds ?? (() => Math.floor(Date.now() / 1000));
    // Map<jti, expEpochSeconds>. Entry is replayed-rejected as long as the
    // current `now` is <= stored exp.
    const seenMap = new Map();
    return {
        seen(jti, expEpochSeconds, nowSeconds) {
            const cutoff = nowSeconds ?? fallbackNow();
            // GC expired entries lazily — only when we are over the cap.
            if (seenMap.size > max) {
                for (const [k, v] of seenMap) {
                    if (v < cutoff)
                        seenMap.delete(k);
                }
                while (seenMap.size > max) {
                    const firstKey = seenMap.keys().next().value;
                    if (firstKey === undefined)
                        break;
                    seenMap.delete(firstKey);
                }
            }
            const prev = seenMap.get(jti);
            if (prev !== undefined && prev >= cutoff)
                return true;
            seenMap.set(jti, expEpochSeconds);
            return false;
        },
        size() { return seenMap.size; },
    };
}
// ── Header constants ───────────────────────────────────────────────────────
/**
 * The full set of incoming headers the gateway MUST strip before the auth
 * pass and before injecting verified identity. Any of these arriving on the
 * inbound request from the public internet is a spoof attempt.
 */
exports.STRIPPED_INBOUND_HEADERS = Object.freeze([
    'x-dos-gateway-token',
    'x-user-sub',
    'x-user-id',
    'x-user-email',
    'x-user-name',
    'x-user-roles',
    'x-tenant-id',
    'x-tenant-code',
    'x-platform-super-admin',
]);
exports.GATEWAY_ORIGIN_HEADER = 'x-dos-gateway-token';
//# sourceMappingURL=gateway-origin.js.map
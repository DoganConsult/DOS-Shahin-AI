"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripInboundIdentityHeaders = exports.signGatewayOrigin = exports.STRIPPED_INBOUND_HEADERS = exports.GATEWAY_ORIGIN_HEADER = void 0;
/**
 * Gateway-origin signer (Wave 1).
 *
 * MIRROR — keep this 1:1 with the canonical implementation at
 *   platform/dauth/packages/shared/src/gateway-origin.ts
 *
 * The two copies exist because:
 *   • The gateway is intentionally a minimal-dependency service (its
 *     package.json mirrors a "thin shell" — no workspace deps on the
 *     DAuth package today; adding one would pull a large dependency
 *     graph through this trust-critical entry point).
 *   • The signer is ~40 lines of pure HMAC crypto, low duplication risk.
 *   • A contract test in `__tests__/gateway-origin.contract.test.ts`
 *     produces fixed signed tokens with known inputs and asserts that
 *     the canonical verifier accepts them. If the two copies drift, the
 *     contract test fails.
 *
 * Any change to the token shape, encoding, or signing algorithm MUST be
 * applied to BOTH files in the same commit, with a passing contract test.
 */
const node_crypto_1 = __importDefault(require("node:crypto"));
exports.GATEWAY_ORIGIN_HEADER = 'x-dos-gateway-token';
/** The full set of incoming headers the gateway MUST strip before auth. */
exports.STRIPPED_INBOUND_HEADERS = Object.freeze([
    'x-dos-gateway-token',
    'x-user-sub',
    'x-user-id',
    'x-user-email',
    'x-user-name',
    'x-user-roles',
    'x-tenant-id',
    'x-tenant-code',
    /** Gateway-only; never trust from clients (injected after JWT verify). */
    'x-platform-super-admin',
]);
function base64UrlEncode(buf) {
    return buf.toString('base64')
        .replace(/=+$/, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
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
exports.signGatewayOrigin = signGatewayOrigin;
/**
 * Strip every identity header listed in `STRIPPED_INBOUND_HEADERS` from the
 * raw inbound request. Called BEFORE auth verification, so a request
 * pre-populated by an attacker with `x-user-sub: evil` cannot survive into
 * `authGuard`'s response chain.
 */
function stripInboundIdentityHeaders(req) {
    for (const h of exports.STRIPPED_INBOUND_HEADERS) {
        delete req.headers[h];
    }
}
exports.stripInboundIdentityHeaders = stripInboundIdentityHeaders;
//# sourceMappingURL=gateway-origin.js.map
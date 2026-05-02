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
exports.KeycloakTokenVerifier = void 0;
/**
 * Keycloak TokenVerifier — verifies RS256/PS256 tokens against a Keycloak
 * realm's JWKS endpoint. Zero runtime dependency on a Keycloak client lib;
 * speaks raw JWKS + uses `jsonwebtoken` (already a transitive dep of
 * services/auth-service) to verify the signature with a PEM derived from
 * the JWK.
 *
 * JWKS is cached in-process with a configurable TTL (default 10 min). On
 * cache miss for a kid, the verifier force-refreshes once before giving
 * up — handles the common key-rotation race.
 *
 * Shadow mode caller compares the returned payload with the native
 * verifier's payload and logs divergences (see
 * `services/auth-service/src/domain/identity/token.service.ts#verifyAccessTokenViaPort`).
 */
const jwt = __importStar(require("jsonwebtoken"));
const token_verifier_port_1 = require("../dauth-ports/token-verifier.port");
class KeycloakTokenVerifier {
    name = 'keycloak';
    cache = null;
    jwksUrl;
    issuer;
    audience;
    cacheTtlMs;
    fetchImpl;
    payloadMapper;
    constructor(options) {
        if (!options.jwksUrl) {
            throw new Error('[@dos/auth:Keycloak] jwksUrl is required');
        }
        this.jwksUrl = options.jwksUrl;
        this.issuer = options.issuer;
        this.audience = options.audience;
        this.cacheTtlMs = options.cacheTtlMs ?? 600_000;
        this.fetchImpl = options.fetchImpl;
        this.payloadMapper = options.payloadMapper;
    }
    async verify(token) {
        const decoded = jwt.decode(token, { complete: true });
        if (!decoded || !decoded.header) {
            throw new token_verifier_port_1.InvalidTokenError('Unable to decode token header', 'MALFORMED', 'keycloak');
        }
        const kid = decoded.header.kid;
        if (!kid) {
            throw new token_verifier_port_1.InvalidTokenError('Token header missing kid', 'MALFORMED', 'keycloak');
        }
        let key = await this.getKey(kid);
        if (!key) {
            await this.refreshJwks();
            key = await this.getKey(kid);
        }
        if (!key) {
            throw new token_verifier_port_1.InvalidTokenError(`No JWK matching kid=${kid}`, 'SIGNATURE', 'keycloak');
        }
        const pem = jwkToPem(key);
        try {
            const verifyOpts = {};
            if (this.issuer) {
                // jsonwebtoken's types model multi-issuer as a non-empty tuple
                // `[string, ...string[]]` rather than `string[]`. At runtime it
                // accepts any string-array where at least one entry matches the
                // token's `iss`. Guard against an empty array (callers using
                // env-parsing collapse that to `undefined`, but belt-and-braces)
                // before casting.
                if (Array.isArray(this.issuer)) {
                    if (this.issuer.length > 0) {
                        verifyOpts.issuer = this.issuer;
                    }
                }
                else {
                    verifyOpts.issuer = this.issuer;
                }
            }
            if (this.audience)
                verifyOpts.audience = this.audience;
            const raw = jwt.verify(token, pem, verifyOpts);
            const payload = (this.payloadMapper ? this.payloadMapper(raw) : defaultMap(raw));
            return { payload, source: 'keycloak', keyId: kid };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            const lower = msg.toLowerCase();
            if (lower.includes('expired'))
                throw new token_verifier_port_1.InvalidTokenError(msg, 'EXPIRED', 'keycloak');
            if (lower.includes('audience'))
                throw new token_verifier_port_1.InvalidTokenError(msg, 'AUDIENCE', 'keycloak');
            if (lower.includes('issuer'))
                throw new token_verifier_port_1.InvalidTokenError(msg, 'ISSUER', 'keycloak');
            if (lower.includes('signature'))
                throw new token_verifier_port_1.InvalidTokenError(msg, 'SIGNATURE', 'keycloak');
            throw new token_verifier_port_1.InvalidTokenError(msg, 'UNKNOWN', 'keycloak');
        }
    }
    /**
     * Eager JWKS warmup. Called by bootstrap so a missing/unreachable JWKS
     * surfaces at startup rather than at the first verify(). Failure here
     * does NOT throw — bootstrap logs and downgrades to native-only.
     */
    async warmup() {
        try {
            await this.refreshJwks();
            return { ok: true, keyCount: this.cache?.keys.size ?? 0 };
        }
        catch (err) {
            return {
                ok: false,
                keyCount: 0,
                error: err instanceof Error ? err.message : String(err),
            };
        }
    }
    async getKey(kid) {
        if (this.cache && Date.now() - this.cache.fetchedAt < this.cacheTtlMs) {
            return this.cache.keys.get(kid) ?? null;
        }
        await this.refreshJwks();
        return this.cache?.keys.get(kid) ?? null;
    }
    async refreshJwks() {
        const fetchFn = this.fetchImpl ?? globalThis.fetch;
        if (!fetchFn)
            throw new Error('[@dos/auth:Keycloak] no fetch implementation available');
        const res = await fetchFn(this.jwksUrl, { headers: { Accept: 'application/json' } });
        if (!res.ok) {
            throw new Error(`[@dos/auth:Keycloak] JWKS fetch failed: ${res.status} ${res.statusText}`);
        }
        const body = (await res.json());
        const keys = new Map();
        for (const k of body.keys ?? []) {
            if (k.kid)
                keys.set(k.kid, k);
        }
        this.cache = { keys, fetchedAt: Date.now() };
    }
}
exports.KeycloakTokenVerifier = KeycloakTokenVerifier;
/**
 * Default mapping of a Keycloak OIDC access token to MinimalAuthPayload.
 * Projects with richer payloads should inject a custom `payloadMapper`.
 *
 * Expected Keycloak claim sources:
 *   - userId   ← `sub`
 *   - email    ← `email`
 *   - tenantId ← `tenant_id` / `tenantId` / first realm role prefixed `tenant:`
 *   - role     ← first non-realm client-role fallback to `preferred_username`
 */
function defaultMap(raw) {
    const userId = String(raw.sub ?? '');
    const email = String(raw.email ?? '');
    const tenantId = raw.tenant_id ??
        raw.tenantId ??
        extractTenantFromRealmRoles(raw) ??
        '';
    const role = extractPrimaryRole(raw) ??
        raw.preferred_username ??
        'user';
    return { userId, email, tenantId, role, jti: raw.jti };
}
function extractTenantFromRealmRoles(raw) {
    const realm = raw.realm_access;
    const roles = realm?.roles ?? [];
    for (const r of roles) {
        if (typeof r === 'string' && r.startsWith('tenant:'))
            return r.slice('tenant:'.length);
    }
    return undefined;
}
function extractPrimaryRole(raw) {
    const realm = raw.realm_access;
    const roles = realm?.roles ?? [];
    const filtered = roles.filter((r) => typeof r === 'string' &&
        !r.startsWith('tenant:') &&
        !['default-roles-master', 'offline_access', 'uma_authorization'].includes(r));
    return filtered[0];
}
/**
 * JWK → PEM. Supports RSA keys via x5c (cert chain) or n/e (modulus/exponent).
 */
function jwkToPem(key) {
    if (key.x5c && key.x5c.length > 0) {
        return `-----BEGIN CERTIFICATE-----\n${chunk(key.x5c[0], 64)}\n-----END CERTIFICATE-----\n`;
    }
    if (key.kty !== 'RSA' || !key.n || !key.e) {
        throw new token_verifier_port_1.InvalidTokenError(`Unsupported JWK kty=${key.kty} (RSA with x5c or n/e expected)`, 'SIGNATURE', 'keycloak');
    }
    const modulus = base64UrlToBuffer(key.n);
    const exponent = base64UrlToBuffer(key.e);
    const derBody = Buffer.concat([encodeInteger(modulus), encodeInteger(exponent)]);
    const sequence = encodeSequence(derBody);
    const bitString = Buffer.concat([Buffer.from([0x00]), sequence]);
    const algorithmIdentifier = Buffer.from([
        0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
    ]);
    const spki = encodeSequence(Buffer.concat([algorithmIdentifier, encodeBitString(bitString)]));
    return `-----BEGIN PUBLIC KEY-----\n${chunk(spki.toString('base64'), 64)}\n-----END PUBLIC KEY-----\n`;
}
function base64UrlToBuffer(input) {
    const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    return Buffer.from(b64 + pad, 'base64');
}
function chunk(s, n) {
    const lines = [];
    for (let i = 0; i < s.length; i += n)
        lines.push(s.slice(i, i + n));
    return lines.join('\n');
}
function encodeLength(len) {
    if (len < 128)
        return Buffer.from([len]);
    const bytes = [];
    let v = len;
    while (v > 0) {
        bytes.unshift(v & 0xff);
        v >>= 8;
    }
    return Buffer.from([0x80 | bytes.length, ...bytes]);
}
function encodeInteger(buf) {
    const body = buf[0] & 0x80 ? Buffer.concat([Buffer.from([0x00]), buf]) : buf;
    return Buffer.concat([Buffer.from([0x02]), encodeLength(body.length), body]);
}
function encodeSequence(body) {
    return Buffer.concat([Buffer.from([0x30]), encodeLength(body.length), body]);
}
function encodeBitString(body) {
    return Buffer.concat([Buffer.from([0x03]), encodeLength(body.length), body]);
}
//# sourceMappingURL=keycloak-token-verifier.js.map
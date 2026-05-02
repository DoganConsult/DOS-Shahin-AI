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
 * realm's JWKS endpoint.
 *
 * Design notes:
 * - Zero runtime dependency on a Keycloak client library. We speak raw JWKS +
 *   use the `jsonwebtoken` package (already a transitive dep) to verify the
 *   signature with a PEM derived from the JWK. This keeps the DAuth module
 *   portable — the Keycloak admin API (used by the identity adapter) is a
 *   separate concern.
 * - JWKS is cached in-process with a configurable TTL (default 10 min). On
 *   cache miss and signature failure, we force-refresh once to handle the
 *   common key-rotation race.
 * - Shadow mode caller compares the returned payload with the native
 *   verifier's payload and logs divergences to the decision ledger under
 *   `engineResults.keycloak`.
 */
const jwt = __importStar(require("jsonwebtoken"));
const token_verifier_port_1 = require("../../ports/token-verifier.port");
const dauth_config_1 = require("../../dauth.config");
class KeycloakTokenVerifier {
    name = 'keycloak';
    cache = null;
    options;
    constructor(options = {}) {
        const jwksUrl = options.jwksUrl ?? dauth_config_1.DAUTH_CONFIG.keycloak.jwksUrl;
        if (!jwksUrl) {
            throw new Error('[DAuth:Keycloak] KEYCLOAK_JWKS_URL is required to use the Keycloak token verifier');
        }
        this.options = {
            jwksUrl,
            cacheTtlMs: options.cacheTtlMs ?? dauth_config_1.DAUTH_CONFIG.keycloak.jwksCacheTtlMs,
            issuer: options.issuer ?? (dauth_config_1.DAUTH_CONFIG.keycloak.issuer || undefined),
            audience: options.audience ?? (dauth_config_1.DAUTH_CONFIG.keycloak.audience || undefined),
            fetchImpl: options.fetchImpl,
        };
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
            // Force refresh — common when Keycloak rotates keys
            await this.refreshJwks();
            key = await this.getKey(kid);
        }
        if (!key) {
            throw new token_verifier_port_1.InvalidTokenError(`No JWK matching kid=${kid}`, 'SIGNATURE', 'keycloak');
        }
        const pem = jwkToPem(key);
        try {
            const verifyOpts = {};
            if (this.options.issuer)
                verifyOpts.issuer = this.options.issuer;
            if (this.options.audience)
                verifyOpts.audience = this.options.audience;
            const payload = jwt.verify(token, pem, verifyOpts);
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
    async getKey(kid) {
        if (this.cache && Date.now() - this.cache.fetchedAt < this.options.cacheTtlMs) {
            return this.cache.keys.get(kid) ?? null;
        }
        await this.refreshJwks();
        return this.cache?.keys.get(kid) ?? null;
    }
    async refreshJwks() {
        const fetchFn = this.options.fetchImpl ?? globalThis.fetch;
        if (!fetchFn) {
            throw new Error('[DAuth:Keycloak] no fetch implementation available');
        }
        const res = await fetchFn(this.options.jwksUrl, {
            headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
            throw new Error(`[DAuth:Keycloak] JWKS fetch failed: ${res.status} ${res.statusText}`);
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
 * Convert a JWK (as returned by Keycloak's JWKS endpoint) to a PEM that
 * `jsonwebtoken` can verify. Handles RSA keys with n/e or x5c cert chains.
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
    // RSA public key in ASN.1 DER — minimal encoder sufficient for n/e inputs.
    const derBody = Buffer.concat([
        encodeInteger(modulus),
        encodeInteger(exponent),
    ]);
    const sequence = encodeSequence(derBody);
    const bitString = Buffer.concat([Buffer.from([0x00]), sequence]);
    const algorithmIdentifier = Buffer.from([
        0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
    ]);
    const subjectPublicKeyInfo = encodeSequence(Buffer.concat([algorithmIdentifier, encodeBitString(bitString)]));
    return `-----BEGIN PUBLIC KEY-----\n${chunk(subjectPublicKeyInfo.toString('base64'), 64)}\n-----END PUBLIC KEY-----\n`;
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
    // Prepend 0x00 when high bit is set to keep it unsigned.
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
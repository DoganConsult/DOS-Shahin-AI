"use strict";
/**
 * TokenVerifier port — lets DAuth delegate JWT verification to a pluggable
 * backend (native jsonwebtoken/jose path vs. Keycloak JWKS) without
 * forcing every call site to be aware of which one is active.
 *
 * The port is **async** because Keycloak's JWKS fetch is I/O-bound. The
 * native adapter can still run synchronously under the hood — it just
 * exposes the same async surface.
 *
 * Native behavior invariant: when no external IdP is configured, the
 * NativeTokenVerifier's verify() result MUST be byte-identical to the
 * service's pre-port verifyAccessTokenAsync output.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidTokenError = void 0;
class InvalidTokenError extends Error {
    code;
    source;
    constructor(message, code, source) {
        super(message);
        this.code = code;
        this.source = source;
        this.name = 'InvalidTokenError';
    }
}
exports.InvalidTokenError = InvalidTokenError;
//# sourceMappingURL=token-verifier.port.js.map
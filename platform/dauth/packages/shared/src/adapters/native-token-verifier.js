"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeTokenVerifier = void 0;
/**
 * Native TokenVerifier — injectable wrapper. The consumer project supplies
 * the actual verify function (typically a closure over its jsonwebtoken or
 * jose call) and this adapter simply exposes it through the port contract.
 *
 * Why injection rather than embedding the verify logic here:
 * - Different projects use different JWT libraries (`jsonwebtoken` vs `jose`).
 * - Different projects have different key-resolution strategies (env JWT_SECRET,
 *   DB-backed kid rotation, Keycloak JWKS).
 * - By keeping this adapter library-agnostic, @dos/auth stays the canonical
 *   port without forcing every consumer onto one JWT library.
 *
 * The NativeTokenVerifier produced here guarantees only two invariants:
 *   1. Given a valid token accepted by the injected verify fn, the returned
 *      payload is the same object the injected fn produced.
 *   2. Given an invalid token, the adapter throws InvalidTokenError with a
 *      source tag of 'native'. The original error message is preserved.
 */
const token_verifier_port_1 = require("../dauth-ports/token-verifier.port");
class NativeTokenVerifier {
    verifyFn;
    options;
    name = 'native';
    constructor(verifyFn, options = {}) {
        this.verifyFn = verifyFn;
        this.options = options;
    }
    async verify(token) {
        try {
            const maybePromise = this.verifyFn(token);
            const payload = (maybePromise instanceof Promise
                ? await maybePromise
                : maybePromise);
            return { payload, source: 'native' };
        }
        catch (err) {
            const code = this.options.mapErrorCode
                ? this.options.mapErrorCode(err)
                : defaultMapErrorCode(err);
            const msg = err instanceof Error ? err.message : String(err);
            throw new token_verifier_port_1.InvalidTokenError(msg, code, 'native');
        }
    }
}
exports.NativeTokenVerifier = NativeTokenVerifier;
function defaultMapErrorCode(err) {
    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
    if (msg.includes('expired'))
        return 'EXPIRED';
    if (msg.includes('signature'))
        return 'SIGNATURE';
    if (msg.includes('audience'))
        return 'AUDIENCE';
    if (msg.includes('issuer'))
        return 'ISSUER';
    if (msg.includes('malformed') || msg.includes('invalid') || msg.includes('jwt'))
        return 'MALFORMED';
    return 'UNKNOWN';
}
//# sourceMappingURL=native-token-verifier.js.map